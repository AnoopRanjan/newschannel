import os
import json
import threading
from datetime import datetime
from typing import Dict, List, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    pass

CHANNELS_FILE = os.path.join(DATA_DIR, "channels.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")
ADS_FILE = os.path.join(DATA_DIR, "ads.json")
FAVOURITES_FILE = os.path.join(DATA_DIR, "favourites.json")
REPORTS_FILE = os.path.join(DATA_DIR, "reports.json")
HEALTH_LOGS_FILE = os.path.join(DATA_DIR, "health_logs.json")
NEWSPAPER_VIDEOS_FILE = os.path.join(DATA_DIR, "newspaper_videos.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

_lock = threading.Lock()

def _load_json(file_path: str, default: Any) -> Any:
    # Check if a modified version exists in /tmp (Vercel serverless environment)
    tmp_file = os.path.join("/tmp/data", os.path.basename(file_path))
    target = tmp_file if os.path.exists(tmp_file) else file_path

    if not os.path.exists(target):
        _save_json(file_path, default)
        return default
    try:
        with open(target, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _save_json(file_path: str, data: Any):
    try:
        temp_file = file_path + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        if os.path.exists(file_path):
            os.replace(temp_file, file_path)
        else:
            os.rename(temp_file, file_path)
    except (OSError, PermissionError) as e:
        # In serverless environments like Vercel with read-only root, fallback to /tmp
        try:
            tmp_dir = "/tmp/data"
            os.makedirs(tmp_dir, exist_ok=True)
            tmp_file = os.path.join(tmp_dir, os.path.basename(file_path))
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

class JsonDatabase:
    """Thread-safe JSON file database replacing relational database."""

    @staticmethod
    def get_channels() -> List[Dict[str, Any]]:
        with _lock:
            channels = _load_json(CHANNELS_FILE, None)
            if not channels:
                try:
                    from app.seed_json import INITIAL_CHANNELS
                    channels = [dict(c) for c in INITIAL_CHANNELS]
                    _save_json(CHANNELS_FILE, channels)
                except Exception:
                    channels = []
            return channels

    @staticmethod
    def save_channels(channels: List[Dict[str, Any]]):
        with _lock:
            _save_json(CHANNELS_FILE, channels)

    @staticmethod
    def get_categories() -> List[Dict[str, Any]]:
        with _lock:
            categories = _load_json(CATEGORIES_FILE, None)
            if not categories:
                try:
                    from app.seed_json import INITIAL_CATEGORIES
                    categories = [dict(c) for c in INITIAL_CATEGORIES]
                    _save_json(CATEGORIES_FILE, categories)
                except Exception:
                    categories = []
            return categories

    @staticmethod
    def save_categories(categories: List[Dict[str, Any]]):
        with _lock:
            _save_json(CATEGORIES_FILE, categories)

    @staticmethod
    def get_ads() -> List[Dict[str, Any]]:
        with _lock:
            ads = _load_json(ADS_FILE, None)
            if not ads:
                try:
                    from app.seed_json import INITIAL_ADS
                    ads = [dict(a) for a in INITIAL_ADS]
                    _save_json(ADS_FILE, ads)
                except Exception:
                    ads = []
            return ads

    @staticmethod
    def save_ads(ads: List[Dict[str, Any]]):
        with _lock:
            _save_json(ADS_FILE, ads)

    @staticmethod
    def get_favourites() -> Dict[str, List[int]]:
        """Maps client_token to list of channel_ids."""
        with _lock:
            return _load_json(FAVOURITES_FILE, {})

    @staticmethod
    def save_favourites(favs: Dict[str, List[int]]):
        with _lock:
            _save_json(FAVOURITES_FILE, favs)

    @staticmethod
    def get_reports() -> List[Dict[str, Any]]:
        with _lock:
            return _load_json(REPORTS_FILE, [])

    @staticmethod
    def save_reports(reports: List[Dict[str, Any]]):
        with _lock:
            _save_json(REPORTS_FILE, reports)

    @staticmethod
    def get_health_logs() -> List[Dict[str, Any]]:
        with _lock:
            return _load_json(HEALTH_LOGS_FILE, [])

    @staticmethod
    def save_health_logs(logs: List[Dict[str, Any]]):
        with _lock:
            _save_json(HEALTH_LOGS_FILE, logs)

    @staticmethod
    def get_newspaper_videos() -> List[Dict[str, Any]]:
        with _lock:
            videos = _load_json(NEWSPAPER_VIDEOS_FILE, None)
            if not videos:
                try:
                    from app.seed_json import INITIAL_NEWSPAPER_VIDEOS
                    videos = [dict(v) for v in INITIAL_NEWSPAPER_VIDEOS]
                    _save_json(NEWSPAPER_VIDEOS_FILE, videos)
                except Exception:
                    videos = []
            # Keep newest video on top (descending by published_at)
            return sorted(videos, key=lambda x: x.get("published_at", ""), reverse=True)

    @staticmethod
    def save_newspaper_videos(videos: List[Dict[str, Any]]):
        with _lock:
            # Sort newest on top before saving
            sorted_videos = sorted(videos, key=lambda x: x.get("published_at", ""), reverse=True)
            _save_json(NEWSPAPER_VIDEOS_FILE, sorted_videos)

    @staticmethod
    def add_newspaper_video(video: Dict[str, Any]) -> Dict[str, Any]:
        with _lock:
            videos = _load_json(NEWSPAPER_VIDEOS_FILE, None)
            if not videos:
                try:
                    from app.seed_json import INITIAL_NEWSPAPER_VIDEOS
                    videos = [dict(v) for v in INITIAL_NEWSPAPER_VIDEOS]
                except Exception:
                    videos = []
            
            # Ensure published_at is set to current time if missing or not latest
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            if not video.get("published_at"):
                video["published_at"] = now_iso
            
            # Ensure newly added video always has the highest timestamp so it stays strictly on top
            existing_max = max([str(v.get("published_at", "")) for v in videos], default="")
            if existing_max and video["published_at"] <= existing_max:
                # Increment past existing max so it is guaranteed on top
                video["published_at"] = (now_iso if now_iso > existing_max else existing_max[:-1] + "Z_9")
                
            # Insert at beginning so newest video is on top
            videos.insert(0, video)
            sorted_videos = sorted(videos, key=lambda x: str(x.get("published_at", "")), reverse=True)
            _save_json(NEWSPAPER_VIDEOS_FILE, sorted_videos)
            return video

    @staticmethod
    def get_users() -> List[Dict[str, Any]]:
        with _lock:
            return _load_json(USERS_FILE, [])

    @staticmethod
    def save_users(users: List[Dict[str, Any]]):
        with _lock:
            _save_json(USERS_FILE, users)

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        users = JsonDatabase.get_users()
        email_clean = email.strip().lower()
        for u in users:
            if u.get("email", "").strip().lower() == email_clean:
                return u
        return None

    @staticmethod
    def upsert_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        with _lock:
            users = _load_json(USERS_FILE, [])
            email_clean = user_data.get("email", "").strip().lower()
            found = False
            for idx, u in enumerate(users):
                if u.get("email", "").strip().lower() == email_clean:
                    users[idx].update(user_data)
                    found = True
                    break
            if not found:
                users.append(user_data)
            _save_json(USERS_FILE, users)
            return user_data
