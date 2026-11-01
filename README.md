# BharatStream — India Live News & Global Streaming Platform
### (Pure Python, Zero Database / Pure JSON Storage, Multi-Earning Ad Engine)

> **A professional, responsive Live News Streaming Website built in Python, HTML5, CSS3, and JavaScript — storing all data in human-readable JSON files without requiring any SQL/external database.**

---

## 🌟 Key Features & Updates

1. **Zero Database / 100% JSON File Storage**:
   - All channels, categories, favourites, user reports, verification logs, and ad settings are persisted directly in `data/*.json` files (`data/channels.json`, `data/categories.json`, `data/ads.json`, `data/favourites.json`, `data/reports.json`, `data/health_logs.json`).
   - Atomic file write mechanisms ensure zero file corruption.
   - Extremely portable and easy to run anywhere with zero database setup.

2. **Working YouTube News Channel Live Streaming**:
   - Embeds official live news streams using the YouTube IFrame API (`https://www.youtube-nocookie.com/embed/...`).
   - Supports both active live **video IDs** and continuous official **YouTube Channel IDs** (`live_stream?channel=...`).
   - Dual-mode playback: Includes live switcher bar (Embedded Stream, Official YouTube Live direct, Broadcaster Portal, and Pop-out Window Player).
   - Broadcaster Fallback Protection: In case of external embed restrictions, smoothly displays a 1-click gateway to the official live stream.

3. **Multiple Types of Earning & Varied Ad Displays**:
   - **Header Leaderboard Display Banner** (`home_top_banner` - 728x90 / responsive)
   - **Sticky Floating Bottom Bar Ad** (`sticky_footer_banner` - Anchored bottom banner with CTA & dismiss button)
   - **In-Feed Native Sponsored Channel Card** (`sponsored_channel_card` - Blended seamlessly in the channel grid with `SPONSORED` badge)
   - **Below-Player Video Display Banner** (`player_below_ad` - Directly underneath stream controls)
   - **Player Sidebar Rectangle** (`sidebar_ad` - 300x250 Medium Rectangle in related channels drawer)
   - **Special Offer / Promoted Deal Banner** (`sponsored_popup_offer`)
   - **Google AdSense Ready**: Supports inserting `ca-pub-XXXXXXXXXX` publisher codes and custom ad scripts.
   - **Impression & Click Analytics**: Live estimation of earnings in USD ($) and INR (₹) based on real viewer activity.

4. **12 Indian Regional Languages Directory**:
   - Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), Assamese (অসমীয়া), and Urdu (اردو).

5. **International English News Broadcasters**:
   - Sky News, Al Jazeera English, DW News, France 24, ABC News Australia, Euronews, TRT World, CNA, CGTN, NHK World-Japan, Bloomberg.

6. **Real-time Breaking News Ticker**:
   - Live RSS news aggregation feed from official press bureaus (DD News, NDTV, BBC, etc.).

---

## 🚀 How to Run the Project

### 1. Start the Server

```bash
# Start the Python application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open in Browser

- **Live Streaming Platform**: [http://localhost:8000](http://localhost:8000)
- **Monetization & Admin Dashboard**: [http://localhost:8000/admin](http://localhost:8000/admin)
- **Interactive API Documentation**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### 3. Run the Automated Test Suite

```bash
python tests/run_tests.py
```

---

## 📁 JSON Data Directory (`/data`)

- `data/channels.json`: 51+ authorized broadcasters with verified stream IDs and official metadata.
- `data/ads.json`: Multi-earning ad slots, image URLs, affiliate targets, impression/click counters, and CPM rates.
- `data/categories.json`: National, Regional, International, Business, Parliament, Tech & Science.
- `data/favourites.json`: Client tokens mapped to saved favourite channels.
- `data/reports.json`: Viewer stream issue tickets.
- `data/health_logs.json`: Stream audit and diagnostics history.

---

## 💰 Monetization Guide: How to Earn

1. Go to `/admin` and click the **Monetization & Various Ad Displays** tab.
2. Toggle any ad placement ON/OFF.
3. Set your target affiliate links (e.g., Amazon Associates, BankBazaar, Zerodha, Hostinger, NordVPN) or paste your Google AdSense snippet into `html_code`.
4. As visitors browse channels and watch live broadcasts, impressions and clicks are tracked, displaying real-time revenue calculations in both USD ($) and INR (₹).
