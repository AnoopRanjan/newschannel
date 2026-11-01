from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import NewsChannel, NewsCategory
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
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve list of news channels matching filters."""
    channels = crud.get_channels(
        db=db,
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
def get_featured_channels(db: Session = Depends(get_db)):
    """Retrieve featured live news channels."""
    return crud.get_channels(db=db, is_featured=True, limit=12)

@router.get("/popular", response_model=List[ChannelResponse])
def get_popular_channels(db: Session = Depends(get_db)):
    """Retrieve most-watched / popular news channels."""
    return crud.get_channels(db=db, is_popular=True, limit=12)

@router.get("/india", response_model=List[ChannelResponse])
def get_india_national_channels(db: Session = Depends(get_db)):
    """Retrieve Indian national news channels."""
    return db.query(NewsChannel).filter(
        NewsChannel.country == "India",
        NewsChannel.category.in_(["National", "Business", "Parliament"]),
        NewsChannel.is_active == True
    ).order_by(NewsChannel.id).all()

@router.get("/international", response_model=List[ChannelResponse])
def get_international_channels(db: Session = Depends(get_db)):
    """Retrieve verified international news channels broadcasting in English."""
    return db.query(NewsChannel).filter(
        NewsChannel.category == "International",
        NewsChannel.language == "English",
        NewsChannel.is_active == True
    ).order_by(NewsChannel.id).all()

@router.get("/regional/{language}", response_model=List[ChannelResponse])
def get_regional_language_channels(language: str, db: Session = Depends(get_db)):
    """Retrieve Indian regional channels for a specific language."""
    return db.query(NewsChannel).filter(
        func.lower(NewsChannel.language) == language.lower(),
        NewsChannel.country == "India",
        NewsChannel.is_active == True
    ).all()

@router.get("/languages/summary")
def get_language_summary(db: Session = Depends(get_db)):
    """Returns languages with their channel count for regional navigation."""
    results = db.query(
        NewsChannel.language,
        func.count(NewsChannel.id).label("channel_count")
    ).filter(NewsChannel.is_active == True, NewsChannel.country == "India")\
     .group_by(NewsChannel.language)\
     .order_by(func.count(NewsChannel.id).desc()).all()
    
    return [{"language": r[0], "count": r[1]} for r in results]

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """Retrieve all news categories."""
    return crud.get_categories(db)

@router.get("/{identifier}", response_model=ChannelResponse)
def get_channel(identifier: str, db: Session = Depends(get_db)):
    """Get single channel by numeric ID or slug, and record view count."""
    if identifier.isdigit():
        channel = crud.get_channel_by_id(db, int(identifier))
    else:
        channel = crud.get_channel_by_slug(db, identifier)
    
    if not channel:
        raise HTTPException(status_code=404, detail="News channel not found")
    
    crud.increment_channel_view(db, channel.id)
    return channel
