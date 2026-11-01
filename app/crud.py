from typing import List, Optional, Dict, Any
from datetime import datetime
from app.json_db import JsonDatabase
from app.schemas import ChannelCreate, ChannelUpdate, UserReportCreate, AdSettingUpdate

def get_channels(
    country: Optional[str] = None,
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    is_featured: Optional[bool] = None,
    is_popular: Optional[bool] = None,
    stream_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    channels = JsonDatabase.get_channels()
    filtered = []

    for ch in channels:
        if is_active is not None and ch.get("is_active") != is_active:
            continue
        if country and ch.get("country", "").lower() != country.lower():
            continue
        if language and language != "All" and ch.get("language", "").lower() != language.lower():
            continue
        if category and category != "All" and ch.get("category", "").lower() != category.lower():
            continue
        if is_featured is not None and ch.get("is_featured") != is_featured:
            continue
        if is_popular is not None and ch.get("is_popular") != is_popular:
            continue
        if stream_type and ch.get("stream_type") != stream_type:
            continue
        if search:
            query = search.lower()
            name_match = query in ch.get("channel_name", "").lower()
            lang_match = query in ch.get("language", "").lower()
            cat_match = query in ch.get("category", "").lower()
            country_match = query in ch.get("country", "").lower()
            if not (name_match or lang_match or cat_match or country_match):
                continue
        filtered.append(ch)

    # Sort featured first, then view_count desc
    filtered.sort(key=lambda x: (not x.get("is_featured", False), -x.get("view_count", 0), x.get("id", 0)))
    return filtered[skip: skip + limit]

def get_channel_by_id(channel_id: int) -> Optional[Dict[str, Any]]:
    channels = JsonDatabase.get_channels()
    for ch in channels:
        if ch.get("id") == channel_id:
            return ch
    return None

def get_channel_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    channels = JsonDatabase.get_channels()
    for ch in channels:
        if ch.get("slug") == slug:
            return ch
    return None

def increment_channel_view(channel_id: int) -> Optional[Dict[str, Any]]:
    channels = JsonDatabase.get_channels()
    target = None
    for ch in channels:
        if ch.get("id") == channel_id:
            ch["view_count"] = ch.get("view_count", 0) + 1
            target = ch
            break
    if target:
        JsonDatabase.save_channels(channels)
    return target

def create_channel(data: ChannelCreate) -> Dict[str, Any]:
    channels = JsonDatabase.get_channels()
    new_id = max([c.get("id", 0) for c in channels] + [0]) + 1
    new_ch = data.model_dump()
    new_ch["id"] = new_id
    new_ch["view_count"] = 0
    new_ch["last_verified_at"] = datetime.utcnow().isoformat()
    new_ch["verification_status"] = "healthy"
    new_ch["created_at"] = datetime.utcnow().isoformat()
    
    channels.append(new_ch)
    JsonDatabase.save_channels(channels)
    return new_ch

def update_channel(channel_id: int, data: ChannelUpdate) -> Optional[Dict[str, Any]]:
    channels = JsonDatabase.get_channels()
    target = None
    for ch in channels:
        if ch.get("id") == channel_id:
            updates = data.model_dump(exclude_unset=True)
            for k, v in updates.items():
                ch[k] = v
            target = ch
            break
    if target:
        JsonDatabase.save_channels(channels)
    return target

def delete_channel(channel_id: int) -> bool:
    channels = JsonDatabase.get_channels()
    initial_len = len(channels)
    channels = [c for c in channels if c.get("id") != channel_id]
    if len(channels) < initial_len:
        JsonDatabase.save_channels(channels)
        return True
    return False

def get_categories() -> List[Dict[str, Any]]:
    return JsonDatabase.get_categories()

def toggle_favourite(channel_id: int, user_id: Optional[int] = None, client_token: Optional[str] = None) -> Dict[str, Any]:
    token = client_token or (str(user_id) if user_id else "anonymous")
    fav_data = JsonDatabase.get_favourites()
    channel_ids = fav_data.get(token, [])

    if channel_id in channel_ids:
        channel_ids.remove(channel_id)
        is_fav = False
        action = "removed"
    else:
        channel_ids.append(channel_id)
        is_fav = True
        action = "added"

    fav_data[token] = channel_ids
    JsonDatabase.save_favourites(fav_data)
    return {"status": action, "is_favourite": is_fav}

def get_user_favourites(user_id: Optional[int] = None, client_token: Optional[str] = None) -> List[Dict[str, Any]]:
    token = client_token or (str(user_id) if user_id else "anonymous")
    fav_data = JsonDatabase.get_favourites()
    fav_ids = set(fav_data.get(token, []))
    if not fav_ids:
        return []
    channels = JsonDatabase.get_channels()
    return [c for c in channels if c.get("id") in fav_ids and c.get("is_active", True)]

def create_stream_health_log(channel_id: int, status: str, http_code: Optional[int], error_message: Optional[str]):
    logs = JsonDatabase.get_health_logs()
    new_id = len(logs) + 1
    log_entry = {
        "id": new_id,
        "channel_id": channel_id,
        "status": status,
        "http_code": http_code,
        "error_message": error_message,
        "checked_at": datetime.utcnow().isoformat()
    }
    logs.insert(0, log_entry)  # newest first
    JsonDatabase.save_health_logs(logs[:100])  # keep last 100

    # Also update channel
    channels = JsonDatabase.get_channels()
    for ch in channels:
        if ch.get("id") == channel_id:
            ch["last_verified_at"] = log_entry["checked_at"]
            ch["verification_status"] = status
            break
    JsonDatabase.save_channels(channels)
    return log_entry

def get_latest_health_logs(limit: int = 50) -> List[Dict[str, Any]]:
    logs = JsonDatabase.get_health_logs()
    channels = {c["id"]: c.get("channel_name", "") for c in JsonDatabase.get_channels()}
    result = []
    for l in logs[:limit]:
        entry = dict(l)
        entry["channel_name"] = channels.get(l.get("channel_id"), f"Channel #{l.get('channel_id')}")
        result.append(entry)
    return result

def create_user_report(data: UserReportCreate) -> Dict[str, Any]:
    reports = JsonDatabase.get_reports()
    new_id = len(reports) + 1
    report = {
        "id": new_id,
        "channel_id": data.channel_id,
        "issue_type": data.issue_type,
        "comment": data.comment,
        "reported_at": datetime.utcnow().isoformat(),
        "is_resolved": False
    }
    reports.insert(0, report)
    JsonDatabase.save_reports(reports)
    return report

def get_user_reports(limit: int = 50, only_unresolved: bool = True) -> List[Dict[str, Any]]:
    reports = JsonDatabase.get_reports()
    channels = {c["id"]: c.get("channel_name", "") for c in JsonDatabase.get_channels()}
    filtered = []
    for r in reports:
        if only_unresolved and r.get("is_resolved", False):
            continue
        entry = dict(r)
        entry["channel_name"] = channels.get(r.get("channel_id"), "Unknown")
        filtered.append(entry)
        if len(filtered) >= limit:
            break
    return filtered

def resolve_user_report(report_id: int) -> bool:
    reports = JsonDatabase.get_reports()
    found = False
    for r in reports:
        if r.get("id") == report_id:
            r["is_resolved"] = True
            found = True
            break
    if found:
        JsonDatabase.save_reports(reports)
    return found

def get_ad_settings() -> List[Dict[str, Any]]:
    return JsonDatabase.get_ads()

def update_ad_setting(slot_name: str, data: AdSettingUpdate) -> Optional[Dict[str, Any]]:
    ads = JsonDatabase.get_ads()
    target = None
    for a in ads:
        if a.get("slot_name") == slot_name:
            updates = data.model_dump(exclude_unset=True)
            for k, v in updates.items():
                a[k] = v
            target = a
            break
    if target:
        JsonDatabase.save_ads(ads)
    return target

def record_ad_impression_or_click(slot_name: str, is_click: bool = False):
    ads = JsonDatabase.get_ads()
    for a in ads:
        if a.get("slot_name") == slot_name:
            if is_click:
                a["clicks"] = a.get("clicks", 0) + 1
            else:
                a["impressions"] = a.get("impressions", 0) + 1
            break
    JsonDatabase.save_ads(ads)

def get_admin_stats() -> Dict[str, Any]:
    channels = JsonDatabase.get_channels()
    total = len(channels)
    active = sum(1 for c in channels if c.get("is_active", True))
    healthy = sum(1 for c in channels if c.get("verification_status") == "healthy" and c.get("is_active", True))
    degraded = total - healthy
    categories_cnt = len(JsonDatabase.get_categories())
    reports = JsonDatabase.get_reports()
    open_reports = sum(1 for r in reports if not r.get("is_resolved", False))

    last_verified = None
    for c in channels:
        v_time = c.get("last_verified_at")
        if v_time and (last_verified is None or v_time > last_verified):
            last_verified = v_time

    # Calculate simulated earnings from impressions & clicks
    ads = JsonDatabase.get_ads()
    total_impressions = sum(a.get("impressions", 0) for a in ads)
    total_clicks = sum(a.get("clicks", 0) for a in ads)
    estimated_earnings_usd = sum(
        (a.get("impressions", 0) / 1000.0) * a.get("estimated_cpm", 2.0) + (a.get("clicks", 0) * 0.15)
        for a in ads
    )

    return {
        "total_channels": total,
        "active_channels": active,
        "healthy_streams": healthy,
        "degraded_streams": degraded,
        "total_categories": categories_cnt,
        "open_reports": open_reports,
        "last_verified_time": last_verified,
        "total_ad_impressions": total_impressions,
        "total_ad_clicks": total_clicks,
        "estimated_earnings_usd": round(estimated_earnings_usd, 2),
        "estimated_earnings_inr": round(estimated_earnings_usd * 86.5, 2)
    }
