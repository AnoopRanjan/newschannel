import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class NewsChannel(Base):
    __tablename__ = "news_channels"

    id = Column(Integer, primary_key=True, index=True)
    channel_name = Column(String(100), nullable=False, index=True)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    country = Column(String(60), default="India", index=True)
    language = Column(String(60), default="Hindi", index=True)
    category = Column(String(60), default="National", index=True)
    
    official_website = Column(String(255), nullable=True)
    official_youtube_channel = Column(String(255), nullable=True)
    video_id = Column(String(100), nullable=True)  # YouTube live stream video ID
    authorized_embed_url = Column(String(500), nullable=True)
    stream_type = Column(String(40), default="youtube_live")  # youtube_live, hls, official_embed, portal_fallback
    logo_url = Column(String(500), nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    is_featured = Column(Boolean, default=False, index=True)
    is_popular = Column(Boolean, default=False, index=True)
    view_count = Column(Integer, default=0)
    
    last_verified_at = Column(DateTime, nullable=True)
    verification_status = Column(String(30), default="healthy", index=True)  # healthy, degraded, fallback_only
    fallback_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    health_logs = relationship("StreamHealthLog", back_populates="channel", cascade="all, delete-orphan")
    reports = relationship("UserReport", back_populates="channel", cascade="all, delete-orphan")
    favourites = relationship("FavouriteChannel", back_populates="channel", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    preferred_language = Column(String(50), default="All")
    google_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    favourites = relationship("FavouriteChannel", back_populates="user", cascade="all, delete-orphan")

class FavouriteChannel(Base):
    __tablename__ = "favourite_channels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    client_token = Column(String(100), nullable=True, index=True) # for guest / anonymous persistence
    channel_id = Column(Integer, ForeignKey("news_channels.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="favourites")
    channel = relationship("NewsChannel", back_populates="favourites")

class NewsCategory(Base):
    __tablename__ = "news_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(60), unique=True, index=True, nullable=False)
    slug = Column(String(60), unique=True, index=True, nullable=False)
    icon = Column(String(50), default="newspaper")
    description = Column(String(255), nullable=True)

class StreamHealthLog(Base):
    __tablename__ = "stream_health_logs"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("news_channels.id"), nullable=False, index=True)
    checked_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    status = Column(String(30), nullable=False)  # healthy, degraded, offline, embed_blocked
    http_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    channel = relationship("NewsChannel", back_populates="health_logs")

class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("news_channels.id"), nullable=False, index=True)
    issue_type = Column(String(50), nullable=False) # stream_offline, audio_issue, geo_blocked, other
    comment = Column(Text, nullable=True)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_resolved = Column(Boolean, default=False)

    channel = relationship("NewsChannel", back_populates="reports")

class AdSetting(Base):
    __tablename__ = "ad_settings"

    id = Column(Integer, primary_key=True, index=True)
    slot_name = Column(String(50), unique=True, nullable=False) # home_top_banner, player_below_ad, sidebar_ad, sponsored_card
    title = Column(String(100), default="Sponsored Partner")
    is_enabled = Column(Boolean, default=True)
    ad_type = Column(String(30), default="custom_banner") # custom_banner, adsense
    headline = Column(String(200), nullable=True)
    target_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    html_code = Column(Text, nullable=True)
