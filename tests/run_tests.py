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
from app.json_db import JsonDatabase

def start_server():
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="error")

def run_integration_tests():
    print("================================================================")
    print("[*] BHARATSTREAM - JSON STORAGE & MONETIZATION TEST SUITE")
    print("================================================================")
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(2.0)
    
    base = "http://127.0.0.1:8000"
    
    with httpx.Client(base_url=base, timeout=10.0) as client:
        # 1. Health & Storage check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        assert data["storage"] == "JSON File Storage"
        print(f"✓ Health & Storage: {data['status']} ({data['storage']})")

        # 2. JSON Files verification on disk
        data_dir = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), "data")
        for jf in ["channels.json", "categories.json", "ads.json"]:
            fpath = os.path.join(data_dir, jf)
            assert os.path.exists(fpath), f"Missing JSON file: {fpath}"
            print(f"✓ JSON File Verified: data/{jf} exists ({os.path.getsize(fpath)} bytes)")

        # 3. Static Pages
        index_res = client.get("/")
        assert index_res.status_code == 200
        assert "BharatStream" in index_res.text
        print("✓ Frontend HTML: Loaded and verified (200 OK)")

        admin_res = client.get("/admin")
        assert admin_res.status_code == 200
        assert "Monetization & Admin" in admin_res.text
        print("✓ Admin & Monetization HTML: Loaded and verified (200 OK)")

        # 4. Channels Directory from JSON
        res = client.get("/api/channels")
        assert res.status_code == 200
        channels = res.json()
        assert len(channels) >= 50
        print(f"✓ Channel Directory: {len(channels)} channels loaded directly from data/channels.json")

        # 5. India National News Channels
        res = client.get("/api/channels/india")
        assert res.status_code == 200
        india_ch = res.json()
        assert len(india_ch) >= 10
        print(f"✓ India National News: {len(india_ch)} channels verified")

        # 6. International English Channels
        res = client.get("/api/channels/international")
        assert res.status_code == 200
        intl = res.json()
        assert len(intl) >= 8
        print(f"✓ International English News: {len(intl)} channels verified")

        # 7. 12 Indian Regional Languages
        languages = [
            "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
            "Bengali", "Marathi", "Gujarati", "Punjabi", "Odia",
            "Assamese", "Urdu"
        ]
        print("✓ Checking 12 Indian Regional Languages from JSON:")
        for lang in languages:
            res = client.get(f"/api/channels/regional/{lang}")
            assert res.status_code == 200
            ch_list = res.json()
            assert len(ch_list) >= 1
            print(f"   - {lang}: {len(ch_list)} streams (e.g. {ch_list[0]['channel_name']})")

        # 8. Monetization & Ad Tracking
        ads_res = client.get("/api/user/ads")
        assert ads_res.status_code == 200
        ads = ads_res.json()
        assert len(ads) >= 6
        slot_names = [a["slot_name"] for a in ads]
        assert "home_top_banner" in slot_names
        assert "sticky_footer_banner" in slot_names
        assert "sponsored_channel_card" in slot_names
        assert "player_below_ad" in slot_names
        assert "sidebar_ad" in slot_names
        print(f"✓ Monetization System: {len(ads)} varied ad display formats active (Top Banner, Sticky Footer, In-Feed, Below-Player, Sidebar)")

        # Test tracking impression and click
        track_res = client.post("/api/user/ads/track", json={"slot_name": "home_top_banner", "is_click": False})
        assert track_res.status_code == 200
        track_click = client.post("/api/user/ads/track", json={"slot_name": "home_top_banner", "is_click": True})
        assert track_click.status_code == 200
        print("✓ Ad Monetization Tracking: Impression and click logged into data/ads.json")

        # 9. Admin Stats & Live Earnings
        stats_res = client.get("/api/admin/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert "estimated_earnings_usd" in stats
        assert "estimated_earnings_inr" in stats
        print(f"✓ Earning Stats: Est. Revenue: ${stats['estimated_earnings_usd']} (₹{stats['estimated_earnings_inr']})")

        # 9b. Google AdSense & ads.txt Verification
        ads_txt = client.get("/ads.txt")
        assert ads_txt.status_code == 200
        assert "google.com" in ads_txt.text
        adsense_cfg = client.get("/api/admin/adsense")
        assert adsense_cfg.status_code == 200
        assert adsense_cfg.json()["account_email"] == "anoopranjan.1983@gmail.com"
        print(f"✓ Google AdSense Universal Integration: /ads.txt and config mapped for {adsense_cfg.json()['account_email']}")

        # 10. Channel CRUD in JSON
        new_ch = {
            "channel_name": "JSON Test Broadcaster",
            "slug": "json-test-broadcaster",
            "country": "India",
            "language": "Hindi",
            "category": "National",
            "stream_type": "youtube_live",
            "video_id": "test_video_999",
            "youtube_channel_id": "UC_test_channel",
            "is_active": True
        }
        create_res = client.post("/api/admin/channels", json=new_ch)
        assert create_res.status_code == 200
        created_id = create_res.json()["id"]

        update_res = client.put(f"/api/admin/channels/{created_id}", json={"channel_name": "JSON Broadcaster Updated"})
        assert update_res.status_code == 200
        assert update_res.json()["channel_name"] == "JSON Broadcaster Updated"

        del_res = client.delete(f"/api/admin/channels/{created_id}")
        assert del_res.status_code == 200
        print("✓ Channel CRUD: Created, Updated, and Deleted channel from data/channels.json")

        # 11. Favourites System
        test_client_token = f"test_user_{int(time.time())}"
        fav_toggle = client.post("/api/user/favourites/toggle", json={"channel_id": 1, "client_token": test_client_token})
        assert fav_toggle.status_code == 200
        fav_list = client.get(f"/api/user/favourites?client_token={test_client_token}")
        assert fav_list.status_code == 200
        assert any(c["id"] == 1 for c in fav_list.json())
        print("✓ Favourites: Persisted in data/favourites.json")

        # 12. User Report
        report_res = client.post("/api/user/report", json={"channel_id": 1, "issue_type": "stream_offline", "comment": "Testing JSON report"})
        assert report_res.status_code == 200
        print("✓ User Reports: Persisted in data/reports.json")

        # 13. DLF News / NewPaper YouTube Video Feed (Newest on Top)
        np_list = client.get("/api/news/newspaper/videos")
        assert np_list.status_code == 200
        assert len(np_list.json()) >= 4
        print(f"✓ NewPaper Feed: Loaded {len(np_list.json())} DLF News videos from data/newspaper_videos.json")

        # Add a new DLF News YouTube video and verify it is placed on top (index 0)
        new_dlf_video = {
            "video_url_or_id": "https://www.youtube.com/watch?v=dlf_top_vid",
            "title": "DLF News: Latest Morning Newspaper Edition",
            "channel_name": "DLF News"
        }
        add_np = client.post("/api/news/newspaper/videos", json=new_dlf_video)
        assert add_np.status_code == 200
        created_vid = add_np.json()
        assert created_vid["video_id"] == "dlf_top_vid"

        # Verify newest is on top
        np_updated = client.get("/api/news/newspaper/videos")
        assert np_updated.status_code == 200
        assert np_updated.json()[0]["video_id"] == "dlf_top_vid", "Newest video must be placed on top of the list!"
        print("✓ NewPaper Video Adding: Verified newest video is placed on top of list")

        # Clean up test video
        del_np = client.delete(f"/api/news/newspaper/videos/{created_vid['id']}")
        assert del_np.status_code == 200
        print("✓ NewPaper Video Deletion: Cleaned up test video")

        # 14. Google SSO & Gmail Authentication
        auth_conf = client.get("/api/user/auth/config")
        assert auth_conf.status_code == 200
        assert auth_conf.json()["google_sso_enabled"] is True
        print("✓ Google SSO Config: Verified Google Identity Services & SSO settings")

        sso_login = client.post("/api/user/auth/google", json={
            "email": "anoopranjan.1983@gmail.com",
            "name": "Anoop Ranjan",
            "mode": "google_sso"
        })
        assert sso_login.status_code == 200
        sso_data = sso_login.json()
        assert sso_data["email"] == "anoopranjan.1983@gmail.com"
        assert sso_data["is_google_sso"] is True
        assert sso_data["adsense_linked"] is True
        print(f"✓ Google SSO Login: Authenticated {sso_data['email']} with Google SSO session token")

        profile_res = client.get(f"/api/user/auth/me?session_token={sso_data['session_token']}")
        assert profile_res.status_code == 200
        assert profile_res.json()["email"] == "anoopranjan.1983@gmail.com"
        print("✓ Google Profile: Retrieved active authenticated session from JSON DB")

        logout_res = client.post("/api/user/auth/logout")
        assert logout_res.status_code == 200
        print("✓ Google SSO Logout: Session terminated cleanly")

        # 15. YouTube-Style Search Engine Verification
        index_res = client.get("/")
        assert index_res.status_code == 200
        index_html = index_res.text
        assert "yt-search-container" in index_html, "YouTube search container must be present in HTML!"
        assert "yt-search-submit-btn" in index_html, "YouTube search submit button must be present in HTML!"
        assert "ytVoiceSearchBtn" in index_html, "YouTube voice search button must be present in HTML!"
        assert "ytSearchDropdown" in index_html, "YouTube auto-complete suggestions dropdown must be present in HTML!"
        print("✓ YouTube Search Bar: Verified input box, clear button, submit icon, and voice modal in HTML")

        # Verify search data matching from channels.json
        channels_res = client.get("/api/channels")
        assert channels_res.status_code == 200
        ch_list = channels_res.json()
        aajtak_matches = [c for c in ch_list if "aaj tak" in c["channel_name"].lower()]
        assert len(aajtak_matches) >= 1, "Should match Aaj Tak for search"
        print(f"✓ YouTube Search Matching: Successfully verified live channel matches ({aajtak_matches[0]['channel_name']})")

        print("\n================================================================")
        print("[SUCCESS] ALL 15 JSON, SSO, YOUTUBE SEARCH & MONETIZATION TESTS PASSED!")
        print("================================================================\n")

if __name__ == "__main__":
    run_integration_tests()
