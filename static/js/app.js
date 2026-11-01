/**
 * BharatStream - Cinema & OTT Movie Streaming Application Controller
 * Features:
 * - Netflix / CinePulse-style Hero Billboard with live stream preview
 * - Horizontal carousel movie rows with smooth left/right arrow sliders
 * - Top 10 Live News in India with giant outline rank numbers (1-10)
 * - 12 Regional Language Cinema Hub Tiles with native Indic scripts
 * - 16:9 widescreen backdrop cards with match scores, resolution badges & hover lift
 * - Zero Database / Pure JSON File Storage & Multi-Earning Ad Monetization Engine
 */

class BharatStreamApp {
  constructor() {
    this.activeTab = 'home';
    this.allChannels = Array.isArray(window.BHARAT_CHANNELS) ? [...window.BHARAT_CHANNELS] : [];
    this.categories = Array.isArray(window.BHARAT_CATEGORIES) ? [...window.BHARAT_CATEGORIES] : [];
    this.headlines = [];
    this.ads = Array.isArray(window.BHARAT_ADS) ? [...window.BHARAT_ADS] : [];
    this.newspaperVideos = Array.isArray(window.BHARAT_NEWSPAPER_VIDEOS) ? [...window.BHARAT_NEWSPAPER_VIDEOS] : [];
    this.favourites = new Set();
    this.selectedRegionalLanguage = 'Hindi';
    this.selectedCategory = 'All';
    this.preferredLanguage = 'All';
    this.clientToken = this.getOrCreateClientToken();

    this.regionalLanguages = [
      { name: 'Hindi', script: 'हिंदी', gradient: 'linear-gradient(135deg, #b91c1c, #450a0a)', watermark: 'हिं' },
      { name: 'Tamil', script: 'தமிழ்', gradient: 'linear-gradient(135deg, #c2410c, #431407)', watermark: 'த' },
      { name: 'Telugu', script: 'తెలుగు', gradient: 'linear-gradient(135deg, #0284c7, #082f49)', watermark: 'తె' },
      { name: 'Kannada', script: 'ಕನ್ನಡ', gradient: 'linear-gradient(135deg, #ca8a04, #713f12)', watermark: 'ಕ' },
      { name: 'Malayalam', script: 'മലയാളം', gradient: 'linear-gradient(135deg, #059669, #064e3b)', watermark: 'മ' },
      { name: 'Bengali', script: 'বাংলা', gradient: 'linear-gradient(135deg, #d97706, #78350f)', watermark: 'বা' },
      { name: 'Marathi', script: 'मराठी', gradient: 'linear-gradient(135deg, #7c3aed, #2e1065)', watermark: 'म' },
      { name: 'Gujarati', script: 'ગુજરાતી', gradient: 'linear-gradient(135deg, #db2777, #500724)', watermark: 'ગુ' },
      { name: 'Punjabi', script: 'ਪੰਜਾਬੀ', gradient: 'linear-gradient(135deg, #2563eb, #172554)', watermark: 'ਪੰ' },
      { name: 'Odia', script: 'ଓଡ଼ିଆ', gradient: 'linear-gradient(135deg, #0891b2, #164e63)', watermark: 'ଓ' },
      { name: 'Assamese', script: 'অসমীয়া', gradient: 'linear-gradient(135deg, #4f46e5, #1e1b4b)', watermark: 'অ' },
      { name: 'Urdu', script: 'اردو', gradient: 'linear-gradient(135deg, #15803d, #052e16)', watermark: 'اردو' }
    ];

    this.init();
  }

  getOrCreateClientToken() {
    let token = localStorage.getItem('bharatstream_client_token');
    if (!token) {
      token = 'guest_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('bharatstream_client_token', token);
    }
    return token;
  }

  async init() {
    this.loadSavedPreferences();
    this.bindDOMEvents();

    // 1. Immediately render channels (Zero loading lag, zero blank screens)
    if (this.allChannels.length > 0) {
      this.renderActiveView();
      this.renderAdPlacements();
    }

    // 2. Fetch latest updates from Python backend in background
    try {
      await Promise.allSettled([
        this.fetchChannels(),
        this.fetchCategories(),
        this.fetchAds(),
        this.fetchNewsTicker(),
        this.fetchHeadlines(),
        this.fetchNewspaperVideos(),
        this.syncFavourites()
      ]);
    } catch (e) {
      console.warn('Background sync note:', e);
    }

    this.renderActiveView();
    this.checkDeepLinkParams();
    this.checkLastWatchedPrompt();
  }

  loadSavedPreferences() {
    const savedLang = localStorage.getItem('bharatstream_preferred_lang');
    if (savedLang) {
      this.preferredLanguage = savedLang;
      const select = document.getElementById('navbarLangSelect');
      if (select) select.value = savedLang;
    }

    const savedFavs = localStorage.getItem('bharatstream_fav_ids');
    if (savedFavs) {
      try {
        const arr = JSON.parse(savedFavs);
        arr.forEach(id => this.favourites.add(id));
      } catch (e) {}
    }
  }

  bindDOMEvents() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    const langSelect = document.getElementById('navbarLangSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.preferredLanguage = e.target.value;
        localStorage.setItem('bharatstream_preferred_lang', this.preferredLanguage);
        this.renderActiveView();
      });
    }

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterChannelsBySearch(e.target.value.trim().toLowerCase());
      });
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['home', 'india', 'regional', 'international', 'trending', 'categories', 'favourites', 'newpaper'].includes(hash)) {
        this.switchTab(hash, false);
      }
    });
  }

  async fetchChannels() {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.allChannels = data;
        }
      }
    } catch (e) {
      console.warn('Backend fetch note (using pre-loaded channel library):', e);
    }
  }

  async fetchNewspaperVideos() {
    try {
      const res = await fetch('/api/news/newspaper/videos');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.newspaperVideos = data;
          if (this.activeTab === 'newpaper') {
            this.renderActiveView();
          }
        }
      }
    } catch (e) {
      console.warn('Backend fetch newspaper note:', e);
    }
  }

  async fetchCategories() {
    try {
      const res = await fetch('/api/channels/categories');
      if (res.ok) {
        this.categories = await res.json();
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }

  async fetchAds() {
    try {
      const res = await fetch('/api/user/ads');
      if (res.ok) {
        this.ads = await res.json();
        this.renderAdPlacements();
      }
    } catch (e) {
      console.error('Failed to load ads:', e);
    }
  }

  async fetchNewsTicker() {
    try {
      const res = await fetch('/api/news/ticker');
      if (res.ok) {
        const items = await res.json();
        this.renderNewsTicker(items);
      }
    } catch (e) {
      console.error('Failed to load ticker:', e);
    }
  }

  async fetchHeadlines() {
    try {
      const res = await fetch('/api/news/headlines?limit=12');
      if (res.ok) {
        this.headlines = await res.json();
      }
    } catch (e) {
      console.error('Failed to load headlines:', e);
    }
  }

  async syncFavourites() {
    try {
      const res = await fetch(`/api/user/favourites?client_token=${this.clientToken}`);
      if (res.ok) {
        const favs = await res.json();
        favs.forEach(c => this.favourites.add(c.id));
        localStorage.setItem('bharatstream_fav_ids', JSON.stringify([...this.favourites]));
      }
    } catch (e) {
      console.error('Failed to sync favourites:', e);
    }
  }

  renderNewsTicker(items) {
    const track = document.getElementById('tickerTrack');
    if (!track || !items.length) return;

    const repeated = [...items, ...items];
    track.innerHTML = repeated.map(it => `
      <a class="ticker-item" href="${it.link}" target="_blank" rel="noopener noreferrer">
        <span class="ticker-source">${it.source}</span>
        <span>${it.title}</span>
      </a>
    `).join('');
  }

  renderAdPlacements() {
    // 1. Top Leaderboard Banner
    const topAd = this.ads.find(a => a.slot_name === 'home_top_banner' && a.is_enabled);
    const topAdContainer = document.getElementById('topAdPlacement');
    if (topAdContainer) {
      if (topAd) {
        topAdContainer.innerHTML = `
          <div class="ad-slot-label">${topAd.badge_text || 'SPONSORED PREMIERE'} • VERIFIED BROADCAST SPONSOR</div>
          <a class="ad-banner-link" href="${topAd.target_url || '#'}" target="_blank" rel="noopener noreferrer" onclick="window.appState.trackAdEvent('home_top_banner', true)">
            <img class="ad-banner-img" src="${topAd.image_url}" alt="${topAd.headline || 'Sponsored'}">
          </a>
        `;
        topAdContainer.style.display = 'block';
        this.trackAdEvent('home_top_banner', false);
      } else {
        topAdContainer.style.display = 'none';
      }
    }

    // 2. Sticky Floating Bottom Bar Ad
    const footerAd = this.ads.find(a => a.slot_name === 'sticky_footer_banner' && a.is_enabled);
    const stickyContainer = document.getElementById('stickyFooterAd');
    if (stickyContainer) {
      if (footerAd) {
        stickyContainer.innerHTML = `
          <div style="background: rgba(7, 10, 19, 0.95); backdrop-filter: blur(12px); border-top: 2px solid #e50914; padding: 10px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 -6px 25px rgba(0,0,0,0.7);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
              <span class="live-badge" style="background: rgba(229, 9, 20, 0.2); color: #fff; border-color: #e50914; font-size: 0.68rem;">
                ${footerAd.badge_text || 'CINEMA PROMO'}
              </span>
              <strong style="color: #fff; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${footerAd.headline}
              </strong>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <a href="${footerAd.target_url}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 7px 16px; font-size: 0.82rem;" onclick="window.appState.trackAdEvent('sticky_footer_banner', true)">
                Claim Offer ↗
              </a>
              <button onclick="document.getElementById('stickyFooterAd').style.display='none'" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem; padding: 4px;">✕</button>
            </div>
          </div>
        `;
        stickyContainer.style.display = 'block';
        this.trackAdEvent('sticky_footer_banner', false);
      } else {
        stickyContainer.style.display = 'none';
      }
    }

    // 3. Below-Player Ad
    const belowAd = this.ads.find(a => a.slot_name === 'player_below_ad' && a.is_enabled);
    const belowContainer = document.getElementById('playerBelowAdContainer');
    if (belowContainer) {
      if (belowAd) {
        belowContainer.innerHTML = `
          <div class="ad-slot-label">${belowAd.badge_text || 'SPONSORED BROADCAST SUPPORTER'}</div>
          <a href="${belowAd.target_url || '#'}" target="_blank" rel="noopener noreferrer" style="display: block;" onclick="window.appState.trackAdEvent('player_below_ad', true)">
            <img src="${belowAd.image_url}" alt="Promoted" style="width: 100%; max-height: 85px; object-fit: cover; border-radius: 8px;">
          </a>
        `;
        belowContainer.style.display = 'block';
      } else {
        belowContainer.style.display = 'none';
      }
    }

    // 4. Sidebar Ad in Player
    const sidebarAd = this.ads.find(a => a.slot_name === 'sidebar_ad' && a.is_enabled);
    const sidebarContainer = document.getElementById('playerSidebarAdContainer');
    if (sidebarContainer) {
      if (sidebarAd) {
        sidebarContainer.innerHTML = `
          <div class="ad-slot-label" style="margin-top: 10px;">${sidebarAd.badge_text || 'AFFILIATE RECOMMENDATION'}</div>
          <a href="${sidebarAd.target_url || '#'}" target="_blank" rel="noopener noreferrer" style="display: block;" onclick="window.appState.trackAdEvent('sidebar_ad', true)">
            <img src="${sidebarAd.image_url}" alt="Sponsored" style="width: 100%; border-radius: 8px;">
          </a>
        `;
        sidebarContainer.style.display = 'block';
      } else {
        sidebarContainer.style.display = 'none';
      }
    }
  }

  trackAdEvent(slotName, isClick = false) {
    fetch('/api/user/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_name: slotName, is_click: isClick })
    }).catch(() => {});
  }

  switchTab(tabName, updateHash = true) {
    this.activeTab = tabName;
    if (updateHash) {
      window.location.hash = tabName;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.value = '';

    this.renderActiveView();
  }

  scrollSlider(sliderId, direction) {
    const track = document.getElementById(sliderId);
    if (!track) return;
    const scrollAmount = track.clientWidth * 0.75 * direction;
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  renderActiveView() {
    const mainView = document.getElementById('mainContentView');
    if (!mainView) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (this.activeTab) {
      case 'home':
        this.renderHomeView(mainView);
        break;
      case 'india':
        this.renderIndiaView(mainView);
        break;
      case 'regional':
        this.renderRegionalView(mainView);
        break;
      case 'international':
        this.renderInternationalView(mainView);
        break;
      case 'trending':
        this.renderTrendingView(mainView);
        break;
      case 'categories':
        this.renderCategoriesView(mainView);
        break;
      case 'newpaper':
        this.renderNewPaperView(mainView);
        break;
      case 'favourites':
        this.renderFavouritesView(mainView);
        break;
      default:
        this.renderHomeView(mainView);
    }
  }

  /* ================= HOME VIEW (CinePulse / Netflix OTT Movie Aesthetic) ================= */
  renderHomeView(container) {
    const featuredList = this.allChannels.filter(c => c.is_featured);
    const heroChannel = featuredList[0] || this.allChannels[0];

    // Rows
    const top10 = [...this.allChannels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);
    const nationalChannels = this.allChannels.filter(c => c.country === 'India' && ['National', 'Business', 'Parliament'].includes(c.category));
    const internationalChannels = this.allChannels.filter(c => c.category === 'International');
    const regionalSpotlight = this.allChannels.filter(c => c.language.toLowerCase() === this.selectedRegionalLanguage.toLowerCase());
    const favChannels = this.allChannels.filter(c => this.favourites.has(c.id));

    // Watchlist Shelf (if any saved)
    let watchlistShelf = '';
    if (favChannels.length > 0) {
      watchlistShelf = this.createMovieShelfHTML({
        title: '⭐ My Watchlist / Pinned Channels',
        subtitle: 'Quick access to your personal live broadcasting stations',
        sliderId: 'sliderWatchlist',
        itemsHTML: favChannels.map(c => this.createCinemaCardHTML(c)).join(''),
        exploreTab: 'favourites'
      });
    }

    // Top 10 Shelf (with giant stylized numbers)
    const top10HTML = top10.map((c, idx) => `
      <div class="top10-card-wrap" onclick="window.playerManager.playChannel(window.appState.getChannelById(${c.id}))">
        <div class="top10-rank-num">${idx + 1}</div>
        ${this.createCinemaCardHTML(c)}
      </div>
    `).join('');

    container.innerHTML = `
      <!-- 1. Cinematic Hero Billboard -->
      ${heroChannel ? this.renderHeroBillboard(heroChannel) : ''}

      <!-- 2. Personal Watchlist Shelf (if any) -->
      ${watchlistShelf}

      <!-- 3. Top 10 Live News in India Today -->
      <div class="movie-shelf">
        <div class="shelf-header">
          <h2 class="shelf-title">
            <span class="shelf-accent">|</span> 🏆 Top 10 Live News in India Today
          </h2>
          <span class="shelf-explore" onclick="window.appState.switchTab('trending')">Explore All ›</span>
        </div>
        <div class="slider-wrapper">
          <button class="slider-arrow prev" onclick="window.appState.scrollSlider('sliderTop10', -1)" aria-label="Previous">‹</button>
          <div class="slider-track" id="sliderTop10">
            ${top10HTML}
          </div>
          <button class="slider-arrow next" onclick="window.appState.scrollSlider('sliderTop10', 1)" aria-label="Next">›</button>
        </div>
      </div>

      <!-- 4. Prime Indian National News Broadcasters Slider -->
      ${this.createMovieShelfHTML({
        title: '🔴 Popular Indian National Broadcasters',
        subtitle: 'Official public service and private national satellite news networks',
        sliderId: 'sliderNational',
        itemsHTML: this.renderSliderWithSponsoredAd(nationalChannels, 'sliderNational'),
        exploreTab: 'india'
      })}

      <!-- 5. 12 Regional Language Cinema Hub Tiles -->
      <div class="movie-shelf" style="margin-top: 10px;">
        <div class="shelf-header">
          <h2 class="shelf-title">
            <span class="shelf-accent">|</span> 🗺️ 12 Regional Language Hubs
          </h2>
          <span class="shelf-explore" onclick="window.appState.switchTab('regional')">Browse All Languages ›</span>
        </div>
        <div class="genre-hub-grid">
          ${this.regionalLanguages.map(l => {
            const count = this.allChannels.filter(c => c.language.toLowerCase() === l.name.toLowerCase()).length;
            const isSelected = this.selectedRegionalLanguage.toLowerCase() === l.name.toLowerCase();
            return `
              <div class="genre-card ${isSelected ? 'active' : ''}" style="background: ${l.gradient};" onclick="window.appState.selectRegionalLanguage('${l.name}')">
                <div class="genre-watermark">${l.watermark}</div>
                <div>
                  <div class="genre-name">${l.name}</div>
                  <div class="genre-script">${l.script}</div>
                </div>
                <div class="genre-badge">${count} Live Channels</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 6. Active Regional Language Spotlight Carousel -->
      ${this.createMovieShelfHTML({
        title: `🎭 ${this.selectedRegionalLanguage} Regional News Spotlight`,
        subtitle: `Verified live news channels broadcasting in ${this.selectedRegionalLanguage}`,
        sliderId: 'sliderRegionalActive',
        itemsHTML: regionalSpotlight.length > 0 
          ? regionalSpotlight.map(c => this.createCinemaCardHTML(c)).join('')
          : '<div style="padding: 20px; color: var(--text-muted);">No channels found for this language.</div>',
        exploreTab: 'regional'
      })}

      <!-- 7. Global International News (English) Slider -->
      ${this.createMovieShelfHTML({
        title: '🌐 Global Live News (International English)',
        subtitle: 'Leading international public & private English broadcasters broadcasting worldwide',
        sliderId: 'sliderInternational',
        itemsHTML: internationalChannels.map(c => this.createCinemaCardHTML(c)).join(''),
        exploreTab: 'international'
      })}

      <!-- 8. NewPaper: Latest DLF News YouTube Bulletins (Newest on Top) -->
      ${this.createMovieShelfHTML({
        title: '📰 NewPaper: Latest DLF News YouTube Bulletins (Newest on Top)',
        subtitle: 'Daily video newspaper headlines & updates from DLF News YouTube channel (Newest First)',
        sliderId: 'sliderNewPaper',
        itemsHTML: this.newspaperVideos.map((v, idx) => `
          <div class="cinema-card" style="background-image: url('${v.thumbnail_url || `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}');" onclick="window.appState.playNewspaperVideo(${v.id})">
            <div class="card-scrim-overlay"></div>
            <div class="card-top-badges">
              <span class="live-badge" style="background: rgba(229, 9, 20, 0.25); color: #fff; border-color: #e50914;">
                ${idx === 0 ? '★ NEWEST' : 'DLF NEWS'}
              </span>
              <span style="font-size: 0.72rem; color: var(--gold-accent); font-weight: 700;">${v.published_label || 'Today'}</span>
            </div>
            <div class="card-bottom-content">
              <div class="card-channel-name" title="${v.title}">${v.title}</div>
              <div class="card-quick-actions">
                <span class="card-lang-pill">NewPaper</span>
                <button class="btn-card-play" title="Play Video">▶</button>
              </div>
            </div>
          </div>
        `).join(''),
        exploreTab: 'newpaper'
      })}

      <!-- 9. Real-time Wire Headlines Reel -->
      <div class="movie-shelf" style="margin-top: 16px;">
        <div class="shelf-header">
          <h2 class="shelf-title">
            <span class="shelf-accent">|</span> ⚡ Breaking Wire Dispatches & Global Press
          </h2>
        </div>
        <div class="headlines-grid">
          ${this.headlines.slice(0, 6).map(h => this.createHeadlineCardHTML(h)).join('')}
        </div>
      </div>
    `;
  }

  /* ================= HERO BILLBOARD BUILDER ================= */
  renderHeroBillboard(channel) {
    const isFav = this.isFavourite(channel.id);
    const bgUrl = channel.backdrop_url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1600&auto=format&fit=crop';
    const logoUrl = channel.logo_url || '/static/img/default-tv.svg';

    return `
      <div class="hero-billboard" style="background-image: url('${bgUrl}');">
        <div class="hero-vignette-bottom"></div>
        <div class="hero-vignette-left"></div>

        <div class="hero-billboard-content">
          <div class="hero-broadcast-badge">
            <span class="live-dot"></span>
            <span style="font-weight: 800; font-size: 0.72rem; color: #fff; letter-spacing: 0.6px;">LIVE NOW</span>
            <span style="color: rgba(255,255,255,0.3);">|</span>
            <span class="hero-top-rank-pill">★ #1 IN INDIA TODAY</span>
          </div>

          <div class="hero-title-wrap">
            <img class="hero-channel-logo" src="${logoUrl}" alt="${channel.channel_name} Logo" onerror="this.style.display='none'">
            <h1 class="hero-channel-name">${channel.channel_name}</h1>
          </div>

          <div class="hero-meta-row">
            <span class="match-score-badge">${channel.match_score || '99% Match'}</span>
            <span class="quality-badge">${channel.quality || '1080p Full HD'}</span>
            <span class="quality-badge">${channel.native_language || channel.language}</span>
            <span class="quality-badge">${channel.category}</span>
            <span class="quality-badge">${channel.country}</span>
          </div>

          <p class="hero-desc">
            ${channel.description || 'Watch 24/7 continuous official live television broadcasting, breaking news developments, prime-time analysis, and special reports.'}
          </p>

          <div class="hero-cta-group">
            <button class="btn-hero-play" onclick="window.playerManager.playChannel(window.appState.getChannelById(${channel.id}))">
              <span style="font-size: 1.15rem;">▶</span> Watch Live Stream
            </button>
            <button class="btn-hero-watchlist" onclick="window.appState.toggleFavourite(${channel.id})">
              <span>${isFav ? '❤️' : '➕'}</span> ${isFav ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
          </div>
        </div>

        <div class="hero-cert-badge">
          U/A 13+ • OFFICIAL BROADCAST
        </div>
      </div>
    `;
  }

  /* ================= MOVIE SHELF SLIDER BUILDER ================= */
  createMovieShelfHTML({ title, subtitle, itemsHTML, sliderId, exploreTab }) {
    return `
      <div class="movie-shelf">
        <div class="shelf-header">
          <div>
            <h2 class="shelf-title">
              <span class="shelf-accent">|</span> ${title}
            </h2>
            ${subtitle ? `<div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 3px;">${subtitle}</div>` : ''}
          </div>
          ${exploreTab ? `<span class="shelf-explore" onclick="window.appState.switchTab('${exploreTab}')">Explore All ›</span>` : ''}
        </div>
        <div class="slider-wrapper">
          <button class="slider-arrow prev" onclick="window.appState.scrollSlider('${sliderId}', -1)" aria-label="Previous">‹</button>
          <div class="slider-track" id="${sliderId}">
            ${itemsHTML}
          </div>
          <button class="slider-arrow next" onclick="window.appState.scrollSlider('${sliderId}', 1)" aria-label="Next">›</button>
        </div>
      </div>
    `;
  }

  /* ================= CINEMA POSTER CARD (16:9 Aspect Ratio) ================= */
  createCinemaCardHTML(channel) {
    const isFav = this.isFavourite(channel.id);
    const bgUrl = channel.backdrop_url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop';
    const logoUrl = channel.logo_url || '/static/img/default-tv.svg';

    return `
      <div class="cinema-card" style="background-image: url('${bgUrl}');" onclick="window.playerManager.playChannel(window.appState.getChannelById(${channel.id}))">
        <div class="card-scrim-overlay"></div>

        <div class="card-top-badges">
          <div class="card-logo-badge">
            <img src="${logoUrl}" alt="${channel.channel_name}" onerror="this.src='/static/img/default-tv.svg'" loading="lazy">
          </div>
          <span class="live-badge">
            <span class="live-dot"></span> LIVE
          </span>
        </div>

        <div class="card-bottom-content">
          <div class="card-channel-name" title="${channel.channel_name}">${channel.channel_name}</div>
          <div class="card-quick-actions">
            <div class="card-meta-indicators">
              <span class="card-match-score">${channel.match_score || '98% Match'}</span>
              <span class="card-lang-pill">${channel.native_language || channel.language}</span>
            </div>
            <div class="card-action-btns">
              <button class="btn-card-fav ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}" onclick="event.stopPropagation(); window.appState.toggleFavourite(${channel.id});">
                ${isFav ? '❤️' : '➕'}
              </button>
              <button class="btn-card-play" title="Play Live Stream">
                ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ================= SPONSORED IN-FEED CARD SLIDER INJECTION ================= */
  renderSliderWithSponsoredAd(channelList, sliderId) {
    let html = '';
    const sponsoredAd = this.ads.find(a => a.slot_name === 'sponsored_channel_card' && a.is_enabled);

    channelList.forEach((c, idx) => {
      html += this.createCinemaCardHTML(c);

      // Inject native sponsored cinema card after 3rd item
      if (idx === 2 && sponsoredAd) {
        html += `
          <div class="cinema-card" style="border: 1px solid #e50914; background: linear-gradient(135deg, rgba(229, 9, 20, 0.15), rgba(7, 10, 19, 0.95));" onclick="window.appState.trackAdEvent('sponsored_channel_card', true); window.open('${sponsoredAd.target_url}', '_blank');">
            <div class="card-scrim-overlay"></div>
            <div class="card-top-badges">
              <span class="live-badge" style="background: rgba(229, 9, 20, 0.25); color: #fff; border-color: #e50914;">
                ★ SPONSORED
              </span>
              <span style="font-size: 0.72rem; color: #f87171; font-weight: 700;">Promoted</span>
            </div>
            <div class="card-bottom-content">
              <div class="card-channel-name" style="color: #fca5a5;">${sponsoredAd.headline}</div>
              <div class="card-quick-actions">
                <span class="card-match-score" style="color: #fbbf24;">Special Offer ↗</span>
                <button class="btn-card-play" style="background: #e50914;">↗</button>
              </div>
            </div>
          </div>
        `;
      }
    });

    return html;
  }

  /* ================= INDIA NATIONAL VIEW ================= */
  renderIndiaView(container) {
    const channels = this.allChannels.filter(c => c.country === 'India' && ['National', 'Business', 'Parliament'].includes(c.category));

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> 🇮🇳 India Live News Directory
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Official public service and national broadcasters (${channels.length} channels verified)
          </div>
        </div>
      </div>

      <div class="channel-grid">
        ${channels.map(c => this.createCinemaCardHTML(c)).join('')}
      </div>
    `;
  }

  /* ================= REGIONAL 12 LANGUAGES VIEW ================= */
  renderRegionalView(container) {
    const currentLang = this.selectedRegionalLanguage || 'Hindi';
    const channels = this.allChannels.filter(c => c.language.toLowerCase() === currentLang.toLowerCase());

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 20px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> 🗺️ Regional News - 12 Indian Languages
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Select an Indian language hub to access authentic regional state broadcasts
          </div>
        </div>
      </div>

      <!-- 12 Language Hub Genre Tiles -->
      <div class="genre-hub-grid" style="margin-bottom: 30px;">
        ${this.regionalLanguages.map(l => {
          const count = this.allChannels.filter(c => c.language.toLowerCase() === l.name.toLowerCase()).length;
          const isSelected = currentLang.toLowerCase() === l.name.toLowerCase();
          return `
            <div class="genre-card ${isSelected ? 'active' : ''}" style="background: ${l.gradient};" onclick="window.appState.selectRegionalLanguage('${l.name}')">
              <div class="genre-watermark">${l.watermark}</div>
              <div>
                <div class="genre-name">${l.name}</div>
                <div class="genre-script">${l.script}</div>
              </div>
              <div class="genre-badge">${count} Live Streams</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="shelf-header" style="margin-bottom: 18px;">
        <h2 class="shelf-title">
          <span class="shelf-accent">|</span> Official ${currentLang} Live Streams (${channels.length})
        </h2>
      </div>

      <div class="channel-grid">
        ${channels.length > 0 
          ? channels.map(c => this.createCinemaCardHTML(c)).join('')
          : '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">No channels listed for this language yet.</div>'
        }
      </div>
    `;
  }

  selectRegionalLanguage(lang) {
    this.selectedRegionalLanguage = lang;
    if (this.activeTab === 'regional') {
      this.renderRegionalView(document.getElementById('mainContentView'));
    } else {
      this.renderHomeView(document.getElementById('mainContentView'));
      const activeShelf = document.getElementById('sliderRegionalActive');
      if (activeShelf) {
        activeShelf.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  /* ================= INTERNATIONAL ENGLISH VIEW ================= */
  renderInternationalView(container) {
    const channels = this.allChannels.filter(c => c.category === 'International');

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> 🌐 International News (English Broadcasters)
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Authorized global English news networks broadcasting worldwide (${channels.length} channels)
          </div>
        </div>
      </div>

      <div class="channel-grid">
        ${channels.map(c => this.createCinemaCardHTML(c)).join('')}
      </div>
    `;
  }

  /* ================= TRENDING VIEW ================= */
  renderTrendingView(container) {
    const sorted = [...this.allChannels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> 🔥 Trending Live Streams Across India & World
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Ranked by live viewer engagement and real-time broadcast popularity
          </div>
        </div>
      </div>

      <div class="channel-grid">
        ${sorted.map(c => this.createCinemaCardHTML(c)).join('')}
      </div>

      <div class="section-header" style="margin-top: 40px; margin-bottom: 20px;">
        <h2 class="shelf-title">
          <span class="shelf-accent">|</span> ⚡ Real-Time Wire Feed
        </h2>
      </div>
      <div class="headlines-grid">
        ${this.headlines.map(h => this.createHeadlineCardHTML(h)).join('')}
      </div>
    `;
  }

  /* ================= CATEGORIES VIEW ================= */
  renderCategoriesView(container) {
    const categories = ['National', 'Regional', 'International', 'Business', 'Parliament', 'Tech & Science'];
    const currentCat = this.selectedCategory || 'National';
    const filtered = this.allChannels.filter(c => c.category.toLowerCase() === currentCat.toLowerCase());

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 20px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> 📑 News Categories
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Browse channels filtered by news specialization
          </div>
        </div>
      </div>

      <div class="language-pills-wrap" style="display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto;">
        ${categories.map(cat => `
          <button class="pill-btn ${cat.toLowerCase() === currentCat.toLowerCase() ? 'active' : ''}" onclick="window.appState.selectCategory('${cat}')">
            ${cat}
          </button>
        `).join('')}
      </div>

      <div class="channel-grid">
        ${filtered.map(c => this.createCinemaCardHTML(c)).join('')}
      </div>
    `;
  }

  selectCategory(cat) {
    this.selectedCategory = cat;
    this.renderCategoriesView(document.getElementById('mainContentView'));
  }

  /* ================= NEWPAPER VIEW (DLF News YouTube Video List - Newest on Top) ================= */
  renderNewPaperView(container) {
    // Sort so newest video is guaranteed on top
    const videos = [...this.newspaperVideos].sort((a, b) => 
      new Date(b.published_at || 0) - new Date(a.published_at || 0)
    );

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 24px; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span class="live-badge" style="background: rgba(229, 9, 20, 0.25); color: #fff; border-color: #e50914;">
              DLF NEWS YOUTUBE
            </span>
            <span style="font-size: 0.8rem; color: var(--gold-accent); font-weight: 700;">★ NEWEST VIDEO ON TOP</span>
          </div>
          <h1 class="shelf-title" style="font-size: 1.8rem;">
            <span class="shelf-accent">|</span> 📰 NewPaper - DLF News Channel Video Feed
          </h1>
          <div style="font-size: 0.92rem; color: var(--text-muted); margin-top: 4px;">
            Daily video newspaper bulletins, government schemes, weather and top headlines from DLF News YouTube channel
          </div>
        </div>
        <div>
          <button class="btn-primary" onclick="window.appState.toggleAddVideoPanel()">
            ➕ Add DLF Video from YouTube
          </button>
        </div>
      </div>

      <!-- Add Video Form Panel -->
      <div id="newpaperAddPanel" class="newpaper-add-panel" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #fff;">
            ➕ Add Video of DLF News Channel from YouTube (Kept on Top)
          </h3>
          <button onclick="window.appState.toggleAddVideoPanel()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>
        <div class="newpaper-form-grid">
          <div>
            <label style="display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">YouTube Video URL or Video ID</label>
            <input type="text" id="newpaperInputUrl" class="search-input" placeholder="e.g. https://www.youtube.com/watch?v=... or Video ID" style="border-radius: 8px;">
          </div>
          <div>
            <label style="display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">Video Title / Edition (Optional)</label>
            <input type="text" id="newpaperInputTitle" class="search-input" placeholder="e.g. DLF News: आज के मुख्य समाचार" style="border-radius: 8px;">
          </div>
          <div>
            <button class="btn-primary" style="width: 100%; justify-content: center; padding: 10px 16px;" onclick="window.appState.submitNewVideo()">
              Add to Top 🚀
            </button>
          </div>
        </div>
        <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 8px;">
          💡 Enter any YouTube video link from DLF News. The newly added video is automatically pinned at the very top of this NewPaper list.
        </div>
      </div>

      <!-- NewPaper Video List Feed (Newest on Top) -->
      <div class="newpaper-feed-list">
        ${videos.length > 0 ? videos.map((v, idx) => `
          <div class="newpaper-card ${idx === 0 ? 'newest-highlight' : ''}">
            <div class="newpaper-thumb-wrap" style="background-image: url('${v.thumbnail_url || `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`}');" onclick="window.appState.playNewspaperVideo(${v.id})">
              <div class="newpaper-thumb-play">▶</div>
              <span class="newpaper-duration-badge">${v.duration || 'Daily Edition'}</span>
            </div>

            <div class="newpaper-content">
              <div class="newpaper-badges-row">
                ${idx === 0 ? '<span class="newpaper-newest-badge">★ NEWEST ON TOP</span>' : ''}
                <span class="newpaper-channel-badge">📺 ${v.channel_name || 'DLF News'}</span>
                <span class="newpaper-date-badge">📅 ${v.published_label || 'Recent Update'}</span>
                <span class="newpaper-date-badge">👁 ${v.views || 'Verified'}</span>
              </div>

              <div class="newpaper-title" onclick="window.appState.playNewspaperVideo(${v.id})">
                ${v.title}
              </div>

              <p class="newpaper-desc">
                ${v.description || 'Watch DLF News daily newspaper video bulletin and breaking headlines from YouTube.'}
              </p>

              <div class="newpaper-actions">
                <button class="btn-primary" style="padding: 7px 18px; font-size: 0.85rem;" onclick="window.appState.playNewspaperVideo(${v.id})">
                  ▶ Watch Video
                </button>
                <a href="https://www.youtube.com/watch?v=${v.video_id}" target="_blank" rel="noopener noreferrer" class="btn-outline" style="padding: 7px 16px; font-size: 0.82rem;">
                  🔴 YouTube ↗
                </a>
                <button class="btn-outline" style="padding: 7px 12px; font-size: 0.82rem; color: #ef4444; border-color: rgba(239,68,68,0.3);" title="Delete Video" onclick="window.appState.deleteNewspaperVideo(${v.id})">
                  🗑
                </button>
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); padding: 50px 20px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 12px;">📰</div>
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">No Videos in NewPaper List</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">Click "Add DLF Video from YouTube" to add your first newspaper video.</p>
            <button class="btn-primary" onclick="window.appState.toggleAddVideoPanel()">➕ Add DLF Video Now</button>
          </div>
        `}
      </div>
    `;
  }

  playNewspaperVideo(id) {
    const v = this.newspaperVideos.find(item => item.id === parseInt(id));
    if (!v || !window.playerManager) return;
    const streamObj = {
      id: 90000 + v.id,
      channel_name: v.title,
      language: 'Hindi',
      country: 'India',
      category: 'NewPaper - DLF News',
      stream_type: 'youtube_live',
      video_id: v.video_id,
      authorized_embed_url: `https://www.youtube-nocookie.com/embed/${v.video_id}?autoplay=1&rel=0&modestbranding=1`,
      official_youtube_channel: 'https://www.youtube.com/@DLSNews',
      description: v.description,
      verification_status: 'healthy'
    };
    window.playerManager.playChannel(streamObj);
  }

  toggleAddVideoPanel() {
    const panel = document.getElementById('newpaperAddPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        const input = document.getElementById('newpaperInputUrl');
        if (input) input.focus();
      }
    }
  }

  async submitNewVideo() {
    const urlInput = document.getElementById('newpaperInputUrl');
    const titleInput = document.getElementById('newpaperInputTitle');
    if (!urlInput || !urlInput.value.trim()) {
      alert('Please enter a YouTube video URL or Video ID');
      return;
    }

    const rawInput = urlInput.value.trim();
    // Extract video ID
    let vId = rawInput;
    const match = rawInput.match(/(?:v=|\/embed\/|\/live\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
    if (match) {
      vId = match[1];
    }

    const payload = {
      video_url_or_id: vId,
      title: titleInput && titleInput.value.trim() ? titleInput.value.trim() : null
    };

    try {
      const res = await fetch('/api/news/newspaper/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        // Insert at index 0 so newest video is on top
        this.newspaperVideos.unshift(created);
        this.renderActiveView();
        alert('DLF News Video successfully added to the top of NewPaper feed!');
      } else {
        alert('Could not save to backend. Adding locally to top of list.');
        this.addLocalNewspaperVideo(vId, payload.title);
      }
    } catch (e) {
      this.addLocalNewspaperVideo(vId, payload.title);
    }
  }

  addLocalNewspaperVideo(vId, title) {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localVideo = {
      id: Date.now(),
      video_id: vId,
      title: title || `DLF News: Latest Newspaper Video Bulletin (${nowStr})`,
      channel_name: 'DLF News',
      published_at: new Date().toISOString(),
      published_label: `Today • Added ${nowStr}`,
      thumbnail_url: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
      duration: 'Daily Bulletin',
      views: 'New',
      category: 'Newspaper Bulletin',
      description: 'DLF News daily video edition covering latest newspaper headlines, schemes, and breaking updates.'
    };
    // Insert at index 0 (newest on top)
    this.newspaperVideos.unshift(localVideo);
    this.renderActiveView();
    alert('DLF News Video added to the top of NewPaper list!');
  }

  async deleteNewspaperVideo(id) {
    if (!confirm('Remove this video from the NewPaper list?')) return;
    this.newspaperVideos = this.newspaperVideos.filter(v => v.id !== id);
    this.renderActiveView();
    try {
      await fetch(`/api/news/newspaper/videos/${id}`, { method: 'DELETE' });
    } catch (e) {}
  }

  /* ================= FAVOURITES / WATCHLIST VIEW ================= */
  renderFavouritesView(container) {
    const favChannels = this.allChannels.filter(c => this.favourites.has(c.id));

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 24px;">
        <div>
          <h1 class="shelf-title" style="font-size: 1.6rem;">
            <span class="shelf-accent">|</span> ⭐ My Watchlist / Pinned Channels
          </h1>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Your personal instant-access live broadcast lineup (${favChannels.length} channels saved)
          </div>
        </div>
      </div>

      ${favChannels.length > 0 ? `
        <div class="channel-grid">
          ${favChannels.map(c => this.createCinemaCardHTML(c)).join('')}
        </div>
      ` : `
        <div style="background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); padding: 60px 24px; text-align: center; max-width: 650px; margin: 40px auto;">
          <div style="font-size: 3.5rem; margin-bottom: 16px;">🤍</div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 8px;">Your Watchlist is Empty</h2>
          <p style="color: var(--text-muted); font-size: 0.94rem; line-height: 1.5; margin-bottom: 22px;">
            Click the heart or plus icon on any news channel card or player dialog to pin your favourite channels here for instant 1-click live playback.
          </p>
          <button class="btn-primary" onclick="window.appState.switchTab('home')">Browse Live News Channels</button>
        </div>
      `}
    `;
  }

  /* ================= SEARCH FILTERING ================= */
  filterChannelsBySearch(query) {
    if (!query) {
      this.renderActiveView();
      return;
    }

    const filtered = this.allChannels.filter(c => 
      c.channel_name.toLowerCase().includes(query) ||
      c.language.toLowerCase().includes(query) ||
      (c.native_language && c.native_language.toLowerCase().includes(query)) ||
      c.country.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(query)))
    );

    const container = document.getElementById('mainContentView');
    if (!container) return;

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 20px;">
        <h2 class="shelf-title">
          <span class="shelf-accent">|</span> Search Results for "${query}" (${filtered.length} channels)
        </h2>
      </div>
      <div class="channel-grid">
        ${filtered.length > 0 
          ? filtered.map(c => this.createCinemaCardHTML(c)).join('')
          : `<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted);">
               No live channels match "${query}". Try searching for channel names like "DD News", "Aaj Tak", or languages like "Tamil" or "English".
             </div>`
        }
      </div>
    `;
  }

  createHeadlineCardHTML(headline) {
    return `
      <div class="headline-card">
        <div class="headline-meta">
          <span>${headline.source}</span>
          <span>${headline.published || 'Recent'}</span>
        </div>
        <div class="headline-title">${headline.title}</div>
        ${headline.summary ? `<div class="headline-summary">${headline.summary}</div>` : ''}
        <a class="headline-readmore" href="${headline.link}" target="_blank" rel="noopener noreferrer">
          Read full official report ↗
        </a>
      </div>
    `;
  }

  getChannelById(id) {
    return this.allChannels.find(c => c.id === parseInt(id));
  }

  isFavourite(channelId) {
    return this.favourites.has(parseInt(channelId));
  }

  async toggleFavourite(channelId) {
    const id = parseInt(channelId);
    const wasFav = this.favourites.has(id);

    if (wasFav) {
      this.favourites.delete(id);
    } else {
      this.favourites.add(id);
    }

    localStorage.setItem('bharatstream_fav_ids', JSON.stringify([...this.favourites]));

    try {
      await fetch('/api/user/favourites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: id, client_token: this.clientToken })
      });
    } catch (e) {}

    // Re-render active view if on favourites tab or update UI
    if (this.activeTab === 'favourites') {
      this.renderActiveView();
    } else {
      // Update heart buttons across DOM
      document.querySelectorAll(`.btn-card-fav[onclick*="${id}"]`).forEach(btn => {
        btn.classList.toggle('active', !wasFav);
        btn.innerHTML = !wasFav ? '❤️' : '➕';
      });
    }
  }

  checkDeepLinkParams() {
    const params = new URLSearchParams(window.location.search);
    const channelSlug = params.get('channel');
    if (channelSlug) {
      const target = this.allChannels.find(c => c.slug === channelSlug);
      if (target && window.playerManager) {
        window.playerManager.playChannel(target);
      }
    }
  }

  checkLastWatchedPrompt() {
    try {
      const saved = localStorage.getItem('bharatstream_last_watched');
      if (saved) {
        const lastChannel = JSON.parse(saved);
        const bar = document.getElementById('resumeWatchingBar');
        if (bar && lastChannel && lastChannel.id) {
          bar.innerHTML = `
            <div style="background: rgba(18, 24, 39, 0.95); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="live-dot"></span>
                <span style="font-size: 0.88rem; color: #e2e8f0;">
                  Continue watching <strong>${lastChannel.channel_name}</strong>?
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <button class="btn-primary" style="padding: 5px 14px; font-size: 0.8rem;" onclick="window.playerManager.playChannel(window.appState.getChannelById(${lastChannel.id})); document.getElementById('resumeWatchingBar').style.display='none';">
                  Resume ▶
                </button>
                <button onclick="document.getElementById('resumeWatchingBar').style.display='none'" style="background: transparent; border: none; color: #94a3b8; cursor: pointer;">✕</button>
              </div>
            </div>
          `;
          bar.style.display = 'block';
        }
      }
    } catch (e) {}
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.playerManager = new StreamPlayerManager();
  window.appState = new BharatStreamApp();
});
