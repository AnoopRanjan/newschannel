import os
import json
import threading
from typing import Dict, List, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

CHANNELS_FILE = os.path.join(DATA_DIR, "channels.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")
ADS_FILE = os.path.join(DATA_DIR, "ads.json")
FAVOURITES_FILE = os.path.join(DATA_DIR, "favourites.json")
REPORTS_FILE = os.path.join(DATA_DIR, "reports.json")
HEALTH_LOGS_FILE = os.path.join(DATA_DIR, "health_logs.json")

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
            return _load_json(CHANNELS_FILE, [])

    @staticmethod
    def save_channels(channels: List[Dict[str, Any]]):
        with _lock:
            _save_json(CHANNELS_FILE, channels)

    @staticmethod
    def get_categories() -> List[Dict[str, Any]]:
        with _lock:
            return _load_json(CATEGORIES_FILE, [])

    @staticmethod
    def save_categories(categories: List[Dict[str, Any]]):
        with _lock:
            _save_json(CATEGORIES_FILE, categories)

    @staticmethod
    def get_ads() -> List[Dict[str, Any]]:
        with _lock:
            return _load_json(ADS_FILE, [])

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
