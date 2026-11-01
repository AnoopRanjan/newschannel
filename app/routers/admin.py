from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Body
from app.config import settings
from app.schemas import (
    ChannelCreate, ChannelUpdate, ChannelResponse,
    AdminStatsResponse, StreamHealthLogResponse,
    UserReportResponse, AdSettingResponse, AdSettingUpdate
)
from app import crud
from app.verifier import run_stream_verification

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.post("/login")
def admin_login(payload: dict = Body(...)):
    """Authenticates admin and returns session credentials."""
    username = payload.get("username")
    password = payload.get("password")
    
    if (username == settings.ADMIN_USERNAME and password == settings.ADMIN_PASSWORD) or \
       (password == settings.ADMIN_API_KEY):
        return {
            "status": "success",
            "token": settings.ADMIN_API_KEY,
            "message": "Admin authentication successful"
        }
    raise HTTPException(status_code=401, detail="Invalid admin username or password")

@router.get("/stats")
def get_stats():
    """Overview statistics for dashboard including ad earnings & streams."""
    stats = crud.get_admin_stats()
    return stats

@router.get("/channels", response_model=List[ChannelResponse])
def get_all_channels():
    """Admin full channel directory including inactive ones from JSON."""
    return crud.get_channels(limit=300, is_active=None)

@router.post("/channels", response_model=ChannelResponse)
def add_channel(channel: ChannelCreate):
    """Add a new news channel to JSON database."""
    existing = crud.get_channel_by_slug(channel.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Channel with this slug already exists")
    created = crud.create_channel(channel)
    return created

@router.put("/channels/{channel_id}", response_model=ChannelResponse)
def edit_channel(channel_id: int, channel: ChannelUpdate):
    """Update existing channel metadata, streams, or status."""
    updated = crud.update_channel(channel_id, channel)
    if not updated:
        raise HTTPException(status_code=404, detail="Channel not found")
    return updated

@router.delete("/channels/{channel_id}")
def remove_channel(channel_id: int):
    """Delete channel from JSON storage."""
    success = crud.delete_channel(channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"status": "deleted", "channel_id": channel_id}

@router.post("/verify")
async def trigger_verification(channel_id: Optional[int] = None):
    """Manually triggers verification check for one channel or all channels."""
    result = await run_stream_verification(channel_id=channel_id)
    return result

@router.get("/health-logs", response_model=List[StreamHealthLogResponse])
def get_health_logs(limit: int = 50):
    """Get recent stream health audit logs from JSON storage."""
    return crud.get_latest_health_logs(limit=limit)

@router.get("/reports", response_model=List[UserReportResponse])
def get_user_reports(unresolved_only: bool = True):
    """Get user reported stream issues."""
    return crud.get_user_reports(limit=50, only_unresolved=unresolved_only)

@router.post("/reports/{report_id}/resolve")
def resolve_report(report_id: int):
    """Mark a user report as resolved in JSON storage."""
    ok = crud.resolve_user_report(report_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "resolved", "report_id": report_id}

@router.get("/ads", response_model=List[AdSettingResponse])
def get_ads_settings():
    """Get all ad slot configurations from JSON storage."""
    return crud.get_ad_settings()

@router.put("/ads/{slot_name}", response_model=AdSettingResponse)
def update_ad_slot(slot_name: str, data: AdSettingUpdate):
    """Update ad slot settings (enable/disable, custom banner, adsense code)."""
    ad = crud.update_ad_setting(slot_name, data)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad slot not found")
    return ad
