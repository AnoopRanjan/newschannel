from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# Channel Schemas
class ChannelBase(BaseModel):
    channel_name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=120)
    country: str = Field("India", max_length=60)
    language: str = Field("Hindi", max_length=60)
    category: str = Field("National", max_length=60)
    official_website: Optional[str] = None
    official_youtube_channel: Optional[str] = None
    video_id: Optional[str] = None
    authorized_embed_url: Optional[str] = None
    stream_type: str = Field("youtube_live", max_length=40)
    logo_url: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    is_popular: bool = False
    fallback_url: Optional[str] = None
    description: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(BaseModel):
    channel_name: Optional[str] = None
    slug: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    official_website: Optional[str] = None
    official_youtube_channel: Optional[str] = None
    video_id: Optional[str] = None
    authorized_embed_url: Optional[str] = None
    stream_type: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_popular: Optional[bool] = None
    fallback_url: Optional[str] = None
    description: Optional[str] = None

class ChannelResponse(ChannelBase):
    id: int
    view_count: int = 0
    last_verified_at: Optional[datetime] = None
    verification_status: str = "healthy"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Category Schemas
class CategoryResponse(BaseModel):
    id: int
    category_name: str
    slug: str
    icon: Optional[str] = "newspaper"
    description: Optional[str] = None

    class Config:
        from_attributes = True

# Favourite Schemas
class FavouriteToggleRequest(BaseModel):
    channel_id: int
    client_token: Optional[str] = None
    user_id: Optional[int] = None

class FavouriteResponse(BaseModel):
    id: int
    channel_id: int
    channel: Optional[ChannelResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    preferred_language: str = "All"

class UserCreate(UserBase):
    google_id: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Stream Health Schemas
class StreamHealthLogResponse(BaseModel):
    id: int
    channel_id: int
    channel_name: Optional[str] = None
    checked_at: datetime
    status: str
    http_code: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

# User Report Schemas
class UserReportCreate(BaseModel):
    channel_id: int
    issue_type: str
    comment: Optional[str] = None

class UserReportResponse(BaseModel):
    id: int
    channel_id: int
    channel_name: Optional[str] = None
    issue_type: str
    comment: Optional[str] = None
    reported_at: datetime
    is_resolved: bool

    class Config:
        from_attributes = True

# Breaking News Headline Schema
class NewsHeadline(BaseModel):
    title: str
    link: str
    published: Optional[str] = None
    source: str
    summary: Optional[str] = None
    category: Optional[str] = "General"
    image_url: Optional[str] = None

# Ad Setting Schemas
class AdSettingResponse(BaseModel):
    id: int
    slot_name: str
    title: str
    is_enabled: bool
    ad_type: str
    headline: Optional[str] = None
    target_url: Optional[str] = None
    image_url: Optional[str] = None
    html_code: Optional[str] = None

    class Config:
        from_attributes = True

class AdSettingUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    ad_type: Optional[str] = None
    headline: Optional[str] = None
    target_url: Optional[str] = None
    image_url: Optional[str] = None
    html_code: Optional[str] = None

# Admin Stats
class AdminStatsResponse(BaseModel):
    total_channels: int
    active_channels: int
    healthy_streams: int
    degraded_streams: int
    total_categories: int
    open_reports: int
    last_verified_time: Optional[datetime] = None
