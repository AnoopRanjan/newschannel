from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas import ChannelResponse, CategoryResponse
from app import crud

router = APIRouter(prefix="/channels", tags=["Channels"])

@router.get("", response_model=List[ChannelResponse])
def list_channels(
    country: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_popular: Optional[bool] = None,
    stream_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """Retrieve list of news channels matching filters from JSON storage."""
    channels = crud.get_channels(
        skip=skip,
        limit=limit,
        country=country,
        language=language,
        category=category,
        search=search,
        is_featured=is_featured,
        is_popular=is_popular,
        stream_type=stream_type,
        is_active=True
    )
    return channels

@router.get("/featured", response_model=List[ChannelResponse])
def get_featured_channels():
    """Retrieve featured live news channels."""
    return crud.get_channels(is_featured=True, limit=12)

@router.get("/popular", response_model=List[ChannelResponse])
def get_popular_channels():
    """Retrieve most-watched / popular news channels."""
    return crud.get_channels(is_popular=True, limit=12)

@router.get("/india", response_model=List[ChannelResponse])
def get_india_national_channels():
    """Retrieve Indian national news channels."""
    channels = crud.get_channels(country="India", limit=100)
    return [c for c in channels if c.get("category") in ["National", "Business", "Parliament"]]

@router.get("/international", response_model=List[ChannelResponse])
def get_international_channels():
    """Retrieve verified international news channels broadcasting in English."""
    channels = crud.get_channels(category="International", limit=100)
    return [c for c in channels if c.get("language") == "English"]

@router.get("/regional/{language}", response_model=List[ChannelResponse])
def get_regional_language_channels(language: str):
    """Retrieve Indian regional channels for a specific language."""
    channels = crud.get_channels(country="India", language=language, limit=100)
    return channels

@router.get("/languages/summary")
def get_language_summary():
    """Returns languages with their channel count for regional navigation."""
    channels = crud.get_channels(country="India", limit=200)
    counts = {}
    for c in channels:
        lang = c.get("language", "Unknown")
        counts[lang] = counts.get(lang, 0) + 1
    
    sorted_langs = sorted(counts.items(), key=lambda x: -x[1])
    return [{"language": lang, "count": count} for lang, count in sorted_langs]

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories():
    """Retrieve all news categories."""
    return crud.get_categories()

@router.get("/{identifier}", response_model=ChannelResponse)
def get_channel(identifier: str):
    """Get single channel by numeric ID or slug, and record view count."""
    if identifier.isdigit():
        channel = crud.get_channel_by_id(int(identifier))
    else:
        channel = crud.get_channel_by_slug(identifier)
    
    if not channel:
        raise HTTPException(status_code=404, detail="News channel not found")
    
    crud.increment_channel_view(channel["id"])
    return channel
