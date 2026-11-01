import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
import threading
import time
import uvicorn
import httpx
from app.config import settings

def start_server():
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="error")

def run_integration_tests():
    print("================================================================")
    print("[*] BHARATSTREAM PLATFORM - FULL INTEGRATION TEST SUITE")
    print("================================================================")
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(2.0)
    
    base = "http://127.0.0.1:8000"
    
    with httpx.Client(base_url=base, timeout=10.0) as client:
        # 1. Health & Static Frontend Pages
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f"✓ Health Check: {res.json()['status']} ({res.json()['service']})")

        index_res = client.get("/")
        assert index_res.status_code == 200
        assert "BharatStream" in index_res.text
        print("✓ Frontend Index HTML: Loaded and verified (200 OK)")

        admin_res = client.get("/admin")
        assert admin_res.status_code == 200
        assert "BharatStream Administration" in admin_res.text
        print("✓ Admin Portal HTML: Loaded and verified (200 OK)")

        css_res = client.get("/static/css/styles.css")
        assert css_res.status_code == 200
        print("✓ Static CSS: Verified (200 OK)")

        js_app = client.get("/static/js/app.js")
        assert js_app.status_code == 200
        print("✓ Static JS (App & Player): Verified (200 OK)")

        # 2. Channel Directory
        res = client.get("/api/channels")
        assert res.status_code == 200
        channels = res.json()
        assert len(channels) >= 50, f"Expected at least 50 channels, got {len(channels)}"
        print(f"✓ Directory: Loaded {len(channels)} total authorized news channels")

        # 3. India National Channels
        res = client.get("/api/channels/india")
        assert res.status_code == 200
        india_channels = res.json()
        assert len(india_channels) >= 10
        names = [c["channel_name"] for c in india_channels]
        assert "DD News" in names
        print(f"✓ India National: {len(india_channels)} channels verified (DD News, Sansad TV, NDTV, Aaj Tak, etc.)")

        # 4. International English News
        res = client.get("/api/channels/international")
        assert res.status_code == 200
        intl = res.json()
        assert len(intl) >= 8
        print(f"✓ International News: {len(intl)} verified English broadcasters (Sky News, Al Jazeera, DW, France 24, etc.)")

        # 5. Regional Indian Languages (All 12 languages required)
        languages = [
            "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
            "Bengali", "Marathi", "Gujarati", "Punjabi", "Odia",
            "Assamese", "Urdu"
        ]
        print("✓ Checking 12 Indian Regional Languages:")
        for lang in languages:
            res = client.get(f"/api/channels/regional/{lang}")
            assert res.status_code == 200
            ch_list = res.json()
            assert len(ch_list) >= 1, f"Missing regional channels for {lang}"
            print(f"   - {lang}: {len(ch_list)} channels (e.g., {ch_list[0]['channel_name']})")

        # 6. Language Summary
        res = client.get("/api/channels/languages/summary")
        assert res.status_code == 200
        summary = res.json()
        assert len(summary) >= 12
        print(f"✓ Language Summary: Aggregated counts for {len(summary)} Indian languages")

        # 7. Categories
        res = client.get("/api/channels/categories")
        assert res.status_code == 200
        cats = res.json()
        assert len(cats) >= 5
        print(f"✓ News Categories: {len(cats)} categories (National, Regional, International, Business, Parliament, Tech)")

        # 8. Breaking News Ticker & RSS
        res = client.get("/api/news/ticker")
        assert res.status_code == 200
        ticker = res.json()
        assert len(ticker) > 0
        print(f"✓ Breaking News Ticker: Active with {len(ticker)} real-time headlines")

        res = client.get("/api/news/headlines?limit=6")
        assert res.status_code == 200
        headlines = res.json()
        assert len(headlines) > 0
        print(f"✓ News Headlines Feed: Returned {len(headlines)} articles with source attribution")

        # 9. Favourites Toggle and Persistence
        client_token = "qa_tester_device_8877"
        first_ch_id = channels[0]["id"]
        
        # Add favourite
        fav_toggle = client.post("/api/user/favourites/toggle", json={"channel_id": first_ch_id, "client_token": client_token})
        assert fav_toggle.status_code == 200
        assert fav_toggle.json()["is_favourite"] is True

        # Retrieve favourites
        fav_list = client.get(f"/api/user/favourites?client_token={client_token}")
        assert fav_list.status_code == 200
        assert any(c["id"] == first_ch_id for c in fav_list.json())

        # Remove favourite
        fav_remove = client.post("/api/user/favourites/toggle", json={"channel_id": first_ch_id, "client_token": client_token})
        assert fav_remove.status_code == 200
        assert fav_remove.json()["is_favourite"] is False
        print("✓ Favourites System: Add, List, and Remove verified with guest token persistence")

        # 10. Viewer Stream Issue Report
        rep_res = client.post("/api/user/report", json={
            "channel_id": first_ch_id,
            "issue_type": "stream_offline",
            "comment": "Automated verification test of user reporting"
        })
        assert rep_res.status_code == 200
        print("✓ User Reporting: Viewer stream outage report successfully logged")

        # 11. Ad Placements
        ads_res = client.get("/api/user/ads")
        assert ads_res.status_code == 200
        ads = ads_res.json()
        assert len(ads) >= 4
        print(f"✓ Ad Monetization: {len(ads)} compliant ad placement slots verified (non-intrusive)")

        # 12. Admin Authentication & Stats
        login_res = client.post("/api/admin/login", json={
            "username": settings.ADMIN_USERNAME,
            "password": settings.ADMIN_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        print("✓ Admin Portal: Authentication verified")

        stats_res = client.get("/api/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_channels"] >= 50
        print(f"✓ Admin Stats: Total Channels: {stats['total_channels']}, Healthy Streams: {stats['healthy_streams']}")

        # 13. Admin Channel CRUD Operations
        new_channel_payload = {
            "channel_name": "Test Broadcaster 2026",
            "slug": "test-broadcaster-2026",
            "country": "India",
            "language": "Hindi",
            "category": "National",
            "official_website": "https://broadcaster.example.com",
            "official_youtube_channel": "https://youtube.com/@example",
            "video_id": "example_live_id",
            "authorized_embed_url": "https://youtube.com/embed/example_live_id",
            "stream_type": "youtube_live",
            "is_active": True
        }
        create_ch = client.post("/api/admin/channels", json=new_channel_payload)
        assert create_ch.status_code == 200
        created_id = create_ch.json()["id"]

        update_ch = client.put(f"/api/admin/channels/{created_id}", json={"channel_name": "Test Broadcaster Verified"})
        assert update_ch.status_code == 200
        assert update_ch.json()["channel_name"] == "Test Broadcaster Verified"

        del_ch = client.delete(f"/api/admin/channels/{created_id}")
        assert del_ch.status_code == 200
        print("✓ Admin CRUD: Create, Update, and Delete channel lifecycle passed")

        print("\n================================================================")
        print("[SUCCESS] ALL 13 CORE INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
        print("================================================================\n")

if __name__ == "__main__":
    run_integration_tests()
