import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.schemas import NewsHeadline
from app.rss_service import fetch_rss_headlines
from app.json_db import JsonDatabase

router = APIRouter(prefix="/news", tags=["News & Headlines"])

class NewspaperVideoCreate(BaseModel):
    video_url_or_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    channel_name: Optional[str] = "DLF News"

def extract_youtube_video_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    patterns = [
        r'(?:v=|\/embed\/|\/live\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return url_or_id

@router.get("/headlines", response_model=List[NewsHeadline])
async def get_headlines(
    category: Optional[str] = Query(None, description="Category filter (National, Business, International, Regional, Tech)"),
    limit: int = Query(25, ge=1, le=100),
    refresh: bool = Query(False, description="Force refresh from live feeds")
):
    """Retrieve aggregated breaking headlines with source attribution and links."""
    items = await fetch_rss_headlines(force_refresh=refresh, category_filter=category)
    return items[:limit]

@router.get("/ticker")
async def get_ticker_news():
    """Retrieve fast, lightweight headlines for top ticker bar."""
    items = await fetch_rss_headlines(force_refresh=False)
    ticker_items = []
    for item in items[:10]:
        ticker_items.append({
            "title": item["title"],
            "source": item["source"],
            "category": item.get("category", "General"),
            "link": item["link"]
        })
    return ticker_items

# ================= DLF News / NewPaper YouTube Video Feed =================
@router.get("/newspaper/videos")
def get_newspaper_videos() -> List[Dict[str, Any]]:
    """
    Retrieve DLF News daily newspaper video bulletins.
    Always sorted with newest video on top.
    """
    return JsonDatabase.get_newspaper_videos()

@router.post("/newspaper/videos")
def add_newspaper_video(payload: NewspaperVideoCreate) -> Dict[str, Any]:
    """
    Add a new video of DLF news channel from YouTube.
    Places the newest video on top of the NewPaper list.
    """
    v_id = extract_youtube_video_id(payload.video_url_or_id)
    if not v_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube video URL or ID")

    now_iso = datetime.utcnow().isoformat()
    now_str = datetime.utcnow().strftime("%d %b, %H:%M UTC")

    current_videos = JsonDatabase.get_newspaper_videos()
    new_id = (max([v.get("id", 0) for v in current_videos], default=0) + 1)

    title = payload.title.strip() if payload.title else f"DLF News: Latest Newspaper Video Bulletin ({now_str})"
    desc = payload.description.strip() if payload.description else "DLF News daily video edition covering latest newspaper headlines, schemes, and breaking updates."

    video_item = {
        "id": new_id,
        "video_id": v_id,
        "title": title,
        "channel_name": payload.channel_name or "DLF News",
        "published_at": now_iso,
        "published_label": f"Added {now_str}",
        "thumbnail_url": f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg",
        "duration": "New Edition",
        "views": "New",
        "category": "Newspaper Bulletin",
        "description": desc
    }

    # Automatically inserts at top (newest on top) and saves
    created = JsonDatabase.add_newspaper_video(video_item)
    return created

@router.delete("/newspaper/videos/{video_id}")
def delete_newspaper_video(video_id: int):
    """Remove a video from the NewPaper feed."""
    videos = JsonDatabase.get_newspaper_videos()
    filtered = [v for v in videos if v.get("id") != video_id]
    if len(filtered) == len(videos):
        raise HTTPException(status_code=404, detail="Video not found")
    JsonDatabase.save_newspaper_videos(filtered)
    return {"status": "success", "message": f"Video {video_id} removed from NewPaper feed"}

