from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Header
from app.schemas import (
    FavouriteToggleRequest, ChannelResponse,
    UserReportCreate, UserReportResponse,
    AdSettingResponse
)
from app import crud

router = APIRouter(prefix="/user", tags=["User Preferences & Favourites"])

@router.post("/favourites/toggle")
def toggle_favourite_channel(
    req: FavouriteToggleRequest,
    x_client_token: Optional[str] = Header(None)
):
    """Toggle a channel as favourite for a guest or authenticated user in JSON storage."""
    token = req.client_token or x_client_token or "anonymous_guest"
    result = crud.toggle_favourite(
        channel_id=req.channel_id,
        user_id=req.user_id,
        client_token=token
    )
    return result

@router.get("/favourites", response_model=List[ChannelResponse])
def get_user_favourites(
    user_id: Optional[int] = Query(None),
    client_token: Optional[str] = Query(None),
    x_client_token: Optional[str] = Header(None)
):
    """Retrieve user's favourite channels from JSON storage."""
    token = client_token or x_client_token or "anonymous_guest"
    channels = crud.get_user_favourites(user_id=user_id, client_token=token)
    return channels

@router.post("/report", response_model=UserReportResponse)
def submit_report(data: UserReportCreate):
    """Allow viewer to report a broken or offline stream."""
    channel = crud.get_channel_by_id(data.channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="News channel not found")
    
    report = crud.create_user_report(data)
    return report

@router.get("/ads", response_model=List[AdSettingResponse])
def get_ad_placements():
    """Retrieve active non-intrusive advertisement banners and sponsor slots."""
    return crud.get_ad_settings()

@router.post("/ads/track")
def track_ad_impression(payload: dict):
    """Tracks ad impressions and clicks to compute estimated earnings."""
    slot_name = payload.get("slot_name")
    is_click = payload.get("is_click", False)
    if slot_name:
        crud.record_ad_impression_or_click(slot_name, is_click=is_click)
    return {"status": "tracked"}
