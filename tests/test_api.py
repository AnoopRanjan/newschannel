import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "BharatStream" in data["service"]

def test_list_channels():
    response = client.get("/api/channels")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    channel = data[0]
    assert "channel_name" in channel
    assert "language" in channel
    assert "country" in channel
    assert "stream_type" in channel
    assert "verification_status" in channel

def test_india_national_channels():
    response = client.get("/api/channels/india")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    names = [c["channel_name"] for c in data]
    assert "DD News" in names
    assert "NDTV 24x7" in names or "India Today" in names

def test_international_channels():
    response = client.get("/api/channels/international")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    names = [c["channel_name"] for c in data]
    assert any("Sky News" in n or "Al Jazeera" in n or "DW News" in n for n in names)

def test_regional_channels():
    res_tamil = client.get("/api/channels/regional/Tamil")
    assert res_tamil.status_code == 200
    assert len(res_tamil.json()) >= 2
    
    res_telugu = client.get("/api/channels/regional/Telugu")
    assert res_telugu.status_code == 200
    assert len(res_telugu.json()) >= 2

    res_malayalam = client.get("/api/channels/regional/Malayalam")
    assert res_malayalam.status_code == 200
    assert len(res_malayalam.json()) >= 2

def test_channel_detail_and_view_count():
    res = client.get("/api/channels")
    first_ch = res.json()[0]
    initial_views = first_ch["view_count"]
    
    slug_res = client.get(f"/api/channels/{first_ch['slug']}")
    assert slug_res.status_code == 200
    assert slug_res.json()["slug"] == first_ch["slug"]
    assert slug_res.json()["view_count"] == initial_views + 1

def test_categories_list():
    res = client.get("/api/channels/categories")
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) >= 5
    cat_names = [c["category_name"] for c in categories]
    assert "National" in cat_names
    assert "Regional" in cat_names
    assert "International" in cat_names

def test_breaking_news_ticker():
    res = client.get("/api/news/ticker")
    assert res.status_code == 200
    ticker = res.json()
    assert isinstance(ticker, list)
    assert len(ticker) > 0
    assert "title" in ticker[0]
    assert "source" in ticker[0]

def test_breaking_news_headlines():
    res = client.get("/api/news/headlines?limit=5")
    assert res.status_code == 200
    headlines = res.json()
    assert isinstance(headlines, list)
    assert len(headlines) <= 5

def test_favourites_toggle_and_list():
    token = "test_user_token_999"
    res = client.get("/api/channels")
    ch_id = res.json()[0]["id"]

    # Add
    toggle_res = client.post(
        "/api/user/favourites/toggle",
        json={"channel_id": ch_id, "client_token": token}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_favourite"] is True

    # List
    fav_res = client.get(f"/api/user/favourites?client_token={token}")
    assert fav_res.status_code == 200
    fav_channels = fav_res.json()
    assert any(c["id"] == ch_id for c in fav_channels)

    # Remove
    toggle_remove = client.post(
        "/api/user/favourites/toggle",
        json={"channel_id": ch_id, "client_token": token}
    )
    assert toggle_remove.status_code == 200
    assert toggle_remove.json()["is_favourite"] is False

def test_user_report_stream():
    res = client.get("/api/channels")
    ch_id = res.json()[0]["id"]

    report_res = client.post(
        "/api/user/report",
        json={
            "channel_id": ch_id,
            "issue_type": "stream_offline",
            "comment": "Testing automated issue reporting pipeline"
        }
    )
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["issue_type"] == "stream_offline"
    assert report_data["is_resolved"] is False

def test_admin_stats():
    res = client.get("/api/admin/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_channels"] >= 50
    assert stats["active_channels"] >= 50
    assert stats["healthy_streams"] >= 1

def test_admin_crud():
    new_ch = {
        "channel_name": "Test Broadcaster 24",
        "slug": "test-broadcaster-24",
        "country": "India",
        "language": "Hindi",
        "category": "National",
        "official_website": "https://test.example.com",
        "official_youtube_channel": "https://youtube.com/@test",
        "video_id": "test_id_123",
        "authorized_embed_url": "https://youtube.com/embed/test_id_123",
        "stream_type": "youtube_live",
        "is_active": True
    }
    create_res = client.post("/api/admin/channels", json=new_ch)
    assert create_res.status_code == 200
    created = create_res.json()
    test_id = created["id"]
    assert created["channel_name"] == "Test Broadcaster 24"

    edit_res = client.put(f"/api/admin/channels/{test_id}", json={"channel_name": "Updated Test Broadcaster"})
    assert edit_res.status_code == 200
    assert edit_res.json()["channel_name"] == "Updated Test Broadcaster"

    del_res = client.delete(f"/api/admin/channels/{test_id}")
    assert del_res.status_code == 200

def test_ads_configuration():
    res = client.get("/api/user/ads")
    assert res.status_code == 200
    ads = res.json()
    assert len(ads) >= 3
    slot_names = [a["slot_name"] for a in ads]
    assert "home_top_banner" in slot_names
    assert "player_below_ad" in slot_names
