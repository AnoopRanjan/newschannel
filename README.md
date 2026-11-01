# BharatStream — India Live News & Global Streaming Platform

> **A professional, responsive, scalable Live News Streaming Platform built with Python 3.12, FastAPI, SQLAlchemy, and modern streaming player architectures.**

BharatStream aggregates legally available free live news streams from official news broadcasters and displays them through an icon-based, responsive streaming interface. The platform supports **Indian national news**, **Indian regional-language news across 12 languages**, and **International English news**.

---

## 🌟 Key Architecture & Compliance Highlights

- **100% Legal & Licensed Broadcasters**: Strictly utilizes official broadcaster embeds, verified YouTube IFrame Player API streams, and public authorized HLS sources. **Zero unauthorized IPTV links or pirated restreaming servers.**
- **Automatic Fallback Protection**: When a broadcaster restricts 3rd-party embedding or enforces geographic access policies, the player automatically displays a certified "Watch on Official Broadcaster Portal" card.
- **12 Indian Regional Languages**: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia, Assamese, and Urdu.
- **International English News**: BBC News, Sky News, Al Jazeera English, DW News, France 24, ABC News Australia, Euronews, TRT World, CNA, CGTN, NHK World, Bloomberg.
- **Automated Stream Verification**: Scheduled Python service (APScheduler + HTTPX) that audits broadcaster reachability and embedding permissions, recording health logs and updating status badges.
- **Breaking News RSS Aggregation**: Real-time breaking headlines feed and ticker with source attribution and direct article links.
- **Responsive Icon-Based Directory**: Desktop (5–6 cards/row), Tablet (3–4 cards/row), Mobile (2 cards/row).
- **Non-Intrusive Monetization**: Ad placements positioned strictly outside the player so they never obscure broadcaster streams.
- **Secure Admin Portal**: Full Channel CRUD, manual stream verification trigger, stream health logs, viewer issue reports, and ad controls.

---

## 🏛️ Navigation Tabs

| Tab | Route | Description |
|---|---|---|
| **Home** | `/` (`#home`) | Featured Live News Spotlight, Most Watched Streams, Popular National Channels, Regional Highlights, Breaking News Feed. |
| **India Live News** | `#india` | Free & officially available Indian national news broadcasters (DD News, Sansad TV, NDTV, Aaj Tak, India Today, Republic TV, Times Now, CNN-News18, CNBC, etc.). |
| **Regional News** | `#regional` | Language-wise navigation across 12 Indian languages with native scripts & broadcaster directories. |
| **International News**| `#international` | Verified global broadcasters transmitting worldwide in English. |
| **Trending News** | `#trending` | High-engagement live streams sorted by view metrics and real-time wire dispatches. |
| **News Categories** | `#categories` | Filter by National, Regional, International, Business, Parliament, and Tech & Science. |
| **My Favourites** | `#favourites` | Personalized pinned channel list stored in localStorage & synced with backend token. |
| **Admin Portal** | `/admin` | Channel CRUD, Stream Verifier trigger, Health logs, User reports, Ad controls. |

---

## 🇮🇳 Indian Regional Languages Coverage (12 Languages)

1. **Hindi (हिंदी)**: Aaj Tak, DD News, ABP News, Zee News, NDTV India, News18 India, Sansad TV.
2. **Tamil (தமிழ்)**: Thanthi TV, Puthiya Thalaimurai, News18 Tamil Nadu.
3. **Telugu (తెలుగు)**: TV9 Telugu, NTV Telugu, Sakshi TV.
4. **Kannada (ಕನ್ನಡ)**: TV9 Kannada, Public TV.
5. **Malayalam (മലയാളം)**: Asianet News, Manorama News, 24 News.
6. **Bengali (বাংলা)**: ABP Ananda, TV9 Bangla.
7. **Marathi (मराठी)**: ABP Majha, TV9 Marathi.
8. **Gujarati (ગુજરાતી)**: TV9 Gujarati, ABP Asmita.
9. **Punjabi (ਪੰਜਾਬੀ)**: PTC News, ABP Sanjha.
10. **Odia (ଓଡ଼ିଆ)**: OTV (Odisha TV), Kanak News.
11. **Assamese (অসমীয়া)**: Pratidin Time.
12. **Urdu (اردو)**: DD Urdu.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy (SQLite by default / PostgreSQL production-ready), Pydantic v2.
- **Frontend**: Responsive HTML5, CSS3 Custom Properties (Dark Navy `#090d16` Design System), Vanilla JS SPA architecture.
- **Streaming Players**:
  - YouTube IFrame Embed API (nocookie privacy mode)
  - HLS.js for authorized `.m3u8` live feeds
  - Native HTML5 Video
  - Official Broadcaster Fallback Portal Gateway
- **Background Tasks**: APScheduler for automated stream health audit.
- **Data Persistence**: SQLite / PostgreSQL with SQLAlchemy ORM (`news_channels`, `users`, `favourite_channels`, `news_categories`, `stream_health_logs`, `user_reports`, `ad_settings`).

---

## 🚀 Getting Started

### 1. Installation

```bash
# Clone or enter project directory
cd c:\Games

# Create and activate virtual environment (optional)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Application

```bash
# Start FastAPI with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser at:
- **Streaming Platform**: [http://localhost:8000](http://localhost:8000)
- **Admin Dashboard**: [http://localhost:8000/admin](http://localhost:8000/admin)
- **Swagger API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### 3. Run the Automated Test Suite

```bash
# Execute integration test suite verifying all 13 core modules & endpoints
python tests/run_tests.py
```

---

## 🔐 Admin Credentials

- **Admin Username**: `admin`
- **Admin Password**: `bharatstream@admin2026`
- **Admin API Key**: `bs-admin-sec-key-998877`

---

## 🚢 Deployment Options

### Docker & Docker Compose
```bash
docker-compose up --build -d
```

### Render Deployment
This repository includes a `render.yaml` blueprint. Link your repository to Render for one-click deployment.

### Railway Deployment
The included `railway.json` automates deployment on Railway using Nixpacks.

### Vercel + Backend Architecture
As Vercel is a serverless environment, the FastAPI backend should be hosted on Render/Railway/Azure, and `vercel.json` proxies `/api/*` requests to the FastAPI backend while serving static frontend assets.

---

## ⚖️ Legal Disclaimer
BharatStream operates strictly as a directory and embed facilitator for officially available broadcasts. It does not re-stream, re-encode, or host copyrighted video content. All streams remain the property of their respective broadcasters and are governed by their terms of service.
