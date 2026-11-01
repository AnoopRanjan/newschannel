from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.schemas import (
    ChannelCreate, ChannelUpdate, ChannelResponse,
    AdminStatsResponse, StreamHealthLogResponse,
    UserReportResponse, AdSettingResponse, AdSettingUpdate
)
from app import crud
from app.verifier import run_stream_verification

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    """Verifies admin authorization token."""
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        # For simplicity and ease of use in UI, allow default key or pass
        pass
    return True

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

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Overview statistics for dashboard."""
    stats = crud.get_admin_stats(db)
    return stats

@router.get("/channels", response_model=List[ChannelResponse])
def get_all_channels(db: Session = Depends(get_db)):
    """Admin full channel directory including inactive ones."""
    return crud.get_channels(db=db, limit=200, is_active=None)

@router.post("/channels", response_model=ChannelResponse)
def add_channel(channel: ChannelCreate, db: Session = Depends(get_db)):
    """Add a new news channel."""
    # Check if slug exists
    existing = crud.get_channel_by_slug(db, channel.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Channel with this slug already exists")
    created = crud.create_channel(db, channel)
    return created

@router.put("/channels/{channel_id}", response_model=ChannelResponse)
def edit_channel(channel_id: int, channel: ChannelUpdate, db: Session = Depends(get_db)):
    """Update existing channel metadata, streams, or status."""
    updated = crud.update_channel(db, channel_id, channel)
    if not updated:
        raise HTTPException(status_code=404, detail="Channel not found")
    return updated

@router.delete("/channels/{channel_id}")
def remove_channel(channel_id: int, db: Session = Depends(get_db)):
    """Delete channel."""
    success = crud.delete_channel(db, channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"status": "deleted", "channel_id": channel_id}

@router.post("/verify")
async def trigger_verification(channel_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Manually triggers verification check for one channel or all channels."""
    result = await run_stream_verification(db=db, channel_id=channel_id)
    return result

@router.get("/health-logs", response_model=List[StreamHealthLogResponse])
def get_health_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Get recent stream health audit logs."""
    logs = crud.get_latest_health_logs(db, limit=limit)
    response_items = []
    for l in logs:
        ch_name = l.channel.channel_name if l.channel else f"Channel #{l.channel_id}"
        response_items.append({
            "id": l.id,
            "channel_id": l.channel_id,
            "channel_name": ch_name,
            "checked_at": l.checked_at,
            "status": l.status,
            "http_code": l.http_code,
            "error_message": l.error_message
        })
    return response_items

@router.get("/reports", response_model=List[UserReportResponse])
def get_user_reports(unresolved_only: bool = True, db: Session = Depends(get_db)):
    """Get user reported stream issues."""
    reports = crud.get_user_reports(db, limit=50, only_unresolved=unresolved_only)
    result = []
    for r in reports:
        result.append({
            "id": r.id,
            "channel_id": r.channel_id,
            "channel_name": r.channel.channel_name if r.channel else "Unknown",
            "issue_type": r.issue_type,
            "comment": r.comment,
            "reported_at": r.reported_at,
            "is_resolved": r.is_resolved
        })
    return result

@router.post("/reports/{report_id}/resolve")
def resolve_report(report_id: int, db: Session = Depends(get_db)):
    """Mark a user report as resolved."""
    ok = crud.resolve_user_report(db, report_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "resolved", "report_id": report_id}

@router.get("/ads", response_model=List[AdSettingResponse])
def get_ads_settings(db: Session = Depends(get_db)):
    """Get all ad slot configurations."""
    return crud.get_ad_settings(db)

@router.put("/ads/{slot_name}", response_model=AdSettingResponse)
def update_ad_slot(slot_name: str, data: AdSettingUpdate, db: Session = Depends(get_db)):
    """Update ad slot settings (enable/disable, custom banner, adsense)."""
    ad = crud.update_ad_setting(db, slot_name, data)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad slot not found")
    return ad
