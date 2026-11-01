from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas import NewsHeadline
from app.rss_service import fetch_rss_headlines

router = APIRouter(prefix="/news", tags=["News & Headlines"])

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
