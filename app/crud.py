from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models import (
    NewsChannel, User, FavouriteChannel, NewsCategory,
    StreamHealthLog, UserReport, AdSetting
)
from app.schemas import ChannelCreate, ChannelUpdate, UserReportCreate, AdSettingUpdate

def get_channels(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    country: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    is_featured: Optional[bool] = None,
    is_popular: Optional[bool] = None,
    stream_type: Optional[str] = None
) -> List[NewsChannel]:
    query = db.query(NewsChannel)
    
    if is_active is not None:
        query = query.filter(NewsChannel.is_active == is_active)
    if country:
        query = query.filter(func.lower(NewsChannel.country) == country.lower())
    if language and language != "All":
        query = query.filter(func.lower(NewsChannel.language) == language.lower())
    if category and category != "All":
        query = query.filter(func.lower(NewsChannel.category) == category.lower())
    if is_featured is not None:
        query = query.filter(NewsChannel.is_featured == is_featured)
    if is_popular is not None:
        query = query.filter(NewsChannel.is_popular == is_popular)
    if stream_type:
        query = query.filter(NewsChannel.stream_type == stream_type)
    if search:
        search_fmt = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(NewsChannel.channel_name).like(search_fmt)) |
            (func.lower(NewsChannel.language).like(search_fmt)) |
            (func.lower(NewsChannel.category).like(search_fmt)) |
            (func.lower(NewsChannel.country).like(search_fmt))
        )
    
    return query.order_by(desc(NewsChannel.is_featured), desc(NewsChannel.view_count), NewsChannel.id).offset(skip).limit(limit).all()

def get_channel_by_id(db: Session, channel_id: int) -> Optional[NewsChannel]:
    return db.query(NewsChannel).filter(NewsChannel.id == channel_id).first()

def get_channel_by_slug(db: Session, slug: str) -> Optional[NewsChannel]:
    return db.query(NewsChannel).filter(NewsChannel.slug == slug).first()

def increment_channel_view(db: Session, channel_id: int):
    channel = db.query(NewsChannel).filter(NewsChannel.id == channel_id).first()
    if channel:
        channel.view_count += 1
        db.commit()
    return channel

def create_channel(db: Session, data: ChannelCreate) -> NewsChannel:
    channel = NewsChannel(**data.model_dump())
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel

def update_channel(db: Session, channel_id: int, data: ChannelUpdate) -> Optional[NewsChannel]:
    channel = db.query(NewsChannel).filter(NewsChannel.id == channel_id).first()
    if not channel:
        return None
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(channel, key, value)
    db.commit()
    db.refresh(channel)
    return channel

def delete_channel(db: Session, channel_id: int) -> bool:
    channel = db.query(NewsChannel).filter(NewsChannel.id == channel_id).first()
    if not channel:
        return False
    db.delete(channel)
    db.commit()
    return True

def get_categories(db: Session) -> List[NewsCategory]:
    return db.query(NewsCategory).all()

def toggle_favourite(db: Session, channel_id: int, user_id: Optional[int] = None, client_token: Optional[str] = None):
    query = db.query(FavouriteChannel).filter(FavouriteChannel.channel_id == channel_id)
    if user_id:
        query = query.filter(FavouriteChannel.user_id == user_id)
    elif client_token:
        query = query.filter(FavouriteChannel.client_token == client_token)
    else:
        return {"status": "error", "message": "Neither user_id nor client_token provided"}
    
    existing = query.first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "is_favourite": False}
    else:
        fav = FavouriteChannel(channel_id=channel_id, user_id=user_id, client_token=client_token)
        db.add(fav)
        db.commit()
        return {"status": "added", "is_favourite": True}

def get_user_favourites(db: Session, user_id: Optional[int] = None, client_token: Optional[str] = None) -> List[NewsChannel]:
    query = db.query(FavouriteChannel)
    if user_id:
        query = query.filter(FavouriteChannel.user_id == user_id)
    elif client_token:
        query = query.filter(FavouriteChannel.client_token == client_token)
    else:
        return []
    
    fav_channel_ids = [fav.channel_id for fav in query.all()]
    if not fav_channel_ids:
        return []
    return db.query(NewsChannel).filter(NewsChannel.id.in_(fav_channel_ids), NewsChannel.is_active == True).all()

def create_stream_health_log(db: Session, channel_id: int, status: str, http_code: Optional[int], error_message: Optional[str]):
    log = StreamHealthLog(
        channel_id=channel_id,
        status=status,
        http_code=http_code,
        error_message=error_message,
        checked_at=datetime.utcnow()
    )
    db.add(log)
    
    # Also update channel last_verified_at and verification_status
    channel = db.query(NewsChannel).filter(NewsChannel.id == channel_id).first()
    if channel:
        channel.last_verified_at = datetime.utcnow()
        channel.verification_status = status
    db.commit()
    return log

def get_latest_health_logs(db: Session, limit: int = 50) -> List[StreamHealthLog]:
    return db.query(StreamHealthLog).order_by(desc(StreamHealthLog.checked_at)).limit(limit).all()

def create_user_report(db: Session, data: UserReportCreate) -> UserReport:
    report = UserReport(
        channel_id=data.channel_id,
        issue_type=data.issue_type,
        comment=data.comment,
        reported_at=datetime.utcnow(),
        is_resolved=False
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

def get_user_reports(db: Session, limit: int = 50, only_unresolved: bool = True) -> List[UserReport]:
    query = db.query(UserReport)
    if only_unresolved:
        query = query.filter(UserReport.is_resolved == False)
    return query.order_by(desc(UserReport.reported_at)).limit(limit).all()

def resolve_user_report(db: Session, report_id: int) -> bool:
    report = db.query(UserReport).filter(UserReport.id == report_id).first()
    if not report:
        return False
    report.is_resolved = True
    db.commit()
    return True

def get_ad_settings(db: Session) -> List[AdSetting]:
    return db.query(AdSetting).all()

def update_ad_setting(db: Session, slot_name: str, data: AdSettingUpdate) -> Optional[AdSetting]:
    ad = db.query(AdSetting).filter(AdSetting.slot_name == slot_name).first()
    if not ad:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ad, k, v)
    db.commit()
    db.refresh(ad)
    return ad

def get_admin_stats(db: Session):
    total = db.query(NewsChannel).count()
    active = db.query(NewsChannel).filter(NewsChannel.is_active == True).count()
    healthy = db.query(NewsChannel).filter(NewsChannel.verification_status == "healthy", NewsChannel.is_active == True).count()
    degraded = db.query(NewsChannel).filter(NewsChannel.verification_status != "healthy", NewsChannel.is_active == True).count()
    categories_cnt = db.query(NewsCategory).count()
    open_reports = db.query(UserReport).filter(UserReport.is_resolved == False).count()
    last_verified = db.query(func.max(NewsChannel.last_verified_at)).scalar()

    return {
        "total_channels": total,
        "active_channels": active,
        "healthy_streams": healthy,
        "degraded_streams": degraded,
        "total_categories": categories_cnt,
        "open_reports": open_reports,
        "last_verified_time": last_verified
    }
