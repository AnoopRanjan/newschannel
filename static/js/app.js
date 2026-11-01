/**
 * BharatStream - Main Application Controller
 * Handles SPA navigation, real-time news ticker, channel directory, favourites, search, and user preferences.
 */

class BharatStreamApp {
  constructor() {
    this.activeTab = 'home';
    this.allChannels = [];
    this.categories = [];
    this.headlines = [];
    this.ads = [];
    this.favourites = new Set();
    this.selectedRegionalLanguage = 'Hindi';
    this.selectedCategory = 'All';
    this.preferredLanguage = 'All';
    this.clientToken = this.getOrCreateClientToken();

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
    
    // Load initial data
    await Promise.all([
      this.fetchChannels(),
      this.fetchCategories(),
      this.fetchAds(),
      this.fetchNewsTicker(),
      this.fetchHeadlines(),
      this.syncFavourites()
    ]);

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
    // Navigation Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Language Dropdown in Navbar
    const langSelect = document.getElementById('navbarLangSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.preferredLanguage = e.target.value;
        localStorage.setItem('bharatstream_preferred_lang', this.preferredLanguage);
        this.renderActiveView();
      });
    }

    // Search Input
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterChannelsBySearch(e.target.value.trim().toLowerCase());
      });
    }

    // Hash navigation change
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['home', 'india', 'regional', 'international', 'trending', 'categories', 'favourites'].includes(hash)) {
        this.switchTab(hash, false);
      }
    });
  }

  async fetchChannels() {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        this.allChannels = await res.json();
      }
    } catch (e) {
      console.error('Failed to load channels:', e);
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

    // Duplicate list for infinite smooth marquee
    const repeated = [...items, ...items];
    track.innerHTML = repeated.map(it => `
      <a class="ticker-item" href="${it.link}" target="_blank" rel="noopener noreferrer">
        <span class="ticker-source">${it.source}</span>
        <span>${it.title}</span>
      </a>
    `).join('');
  }

  renderAdPlacements() {
    const topAdContainer = document.getElementById('topAdPlacement');
    if (topAdContainer && this.ads) {
      const topAd = this.ads.find(a => a.slot_name === 'home_top_banner' && a.is_enabled);
      if (topAd) {
        topAdContainer.innerHTML = `
          <div class="ad-slot-label">SPONSORED PLACEMENT • OFFICIAL PARTNER</div>
          <a class="ad-banner-link" href="${topAd.target_url || '#'}" target="_blank" rel="noopener noreferrer">
            <img class="ad-banner-img" src="${topAd.image_url}" alt="${topAd.headline || 'Sponsored'}">
          </a>
        `;
        topAdContainer.style.display = 'block';
      } else {
        topAdContainer.style.display = 'none';
      }
    }
  }

  switchTab(tabName, updateHash = true) {
    this.activeTab = tabName;
    if (updateHash) {
      window.location.hash = tabName;
    }

    // Update Tab Buttons UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Reset search
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.value = '';

    this.renderActiveView();
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
      case 'favourites':
        this.renderFavouritesView(mainView);
        break;
      default:
        this.renderHomeView(mainView);
    }
  }

  renderHomeView(container) {
    const featured = this.allChannels.filter(c => c.is_featured);
    const heroChannel = featured[0] || this.allChannels[0];
    const popular = this.allChannels.filter(c => c.is_popular).slice(0, 6);
    const indiaNational = this.allChannels.filter(c => c.country === 'India' && ['National', 'Business', 'Parliament'].includes(c.category)).slice(0, 6);
    const international = this.allChannels.filter(c => c.category === 'International').slice(0, 6);

    let favsSection = '';
    const favChannels = this.allChannels.filter(c => this.favourites.has(c.id));
    if (favChannels.length > 0) {
      favsSection = `
        <div class="section-header">
          <div>
            <h2 class="section-title">⭐ My Favourite Channels</h2>
            <div class="section-subtitle">Your personalized instant-access news directory</div>
          </div>
        </div>
        <div class="channel-grid">
          ${favChannels.map(c => this.createChannelCardHTML(c)).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Featured Spotlight Hero -->
      ${heroChannel ? `
        <div class="hero-spotlight">
          <div class="hero-video-box">
            <iframe 
              src="https://www.youtube-nocookie.com/embed/${heroChannel.video_id}?autoplay=0&rel=0&modestbranding=1" 
              title="${heroChannel.channel_name}" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              style="width: 100%; height: 100%; border: none;">
            </iframe>
          </div>
          <div class="hero-info-box">
            <div class="hero-tag">★ FEATURED BROADCASTER</div>
            <h1 class="hero-title">${heroChannel.channel_name}</h1>
            <p class="hero-desc">${heroChannel.description || 'Watch live verified broadcasting and breaking developments.'}</p>
            <div class="meta-badges">
              <span class="meta-pill lang">${heroChannel.language}</span>
              <span class="meta-pill country">${heroChannel.country}</span>
              <span class="meta-pill">${heroChannel.category}</span>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 8px;">
              <button class="btn-primary" onclick="window.playerManager.playChannel(window.appState.getChannelById(${heroChannel.id}))">
                ▶ Watch Fullscreen
              </button>
              <button class="btn-outline" onclick="window.appState.toggleFavourite(${heroChannel.id})">
                ${this.isFavourite(heroChannel.id) ? '❤️ In Favourites' : '🤍 Add to Favourites'}
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      ${favsSection}

      <!-- Most Watched Live Channels -->
      <div class="section-header">
        <div>
          <h2 class="section-title">🔥 Most Watched Live Streams</h2>
          <div class="section-subtitle">Trending broadcasts across India and the globe</div>
        </div>
        <button class="btn-outline" onclick="window.appState.switchTab('trending')">View All Trending →</button>
      </div>
      <div class="channel-grid">
        ${popular.map(c => this.createChannelCardHTML(c)).join('')}
      </div>

      <!-- Popular Indian News Channels -->
      <div class="section-header">
        <div>
          <h2 class="section-title">🇮🇳 Popular Indian National Channels</h2>
          <div class="section-subtitle">Official public & private national broadcasters</div>
        </div>
        <button class="btn-outline" onclick="window.appState.switchTab('india')">View All India →</button>
      </div>
      <div class="channel-grid">
        ${indiaNational.map(c => this.createChannelCardHTML(c)).join('')}
      </div>

      <!-- Regional Language Quick Highlights -->
      <div class="section-header">
        <div>
          <h2 class="section-title">🗺️ Regional News Directory</h2>
          <div class="section-subtitle">Watch grassroots journalism in 12 Indian languages</div>
        </div>
        <button class="btn-outline" onclick="window.appState.switchTab('regional')">Browse Languages →</button>
      </div>
      <div class="language-pills-wrap">
        ${['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu'].map(lang => `
          <button class="pill-btn ${this.selectedRegionalLanguage === lang ? 'active' : ''}" onclick="window.appState.openRegionalLanguage('${lang}')">
            ${lang}
          </button>
        `).join('')}
      </div>

      <!-- International Live News -->
      <div class="section-header">
        <div>
          <h2 class="section-title">🌐 International Live News (English)</h2>
          <div class="section-subtitle">Authorized English-language global broadcasters</div>
        </div>
        <button class="btn-outline" onclick="window.appState.switchTab('international')">View All International →</button>
      </div>
      <div class="channel-grid">
        ${international.map(c => this.createChannelCardHTML(c)).join('')}
      </div>

      <!-- Breaking News Headlines Feed -->
      <div class="section-header" style="margin-top: 36px;">
        <div>
          <h2 class="section-title">📰 Breaking News & Headlines</h2>
          <div class="section-subtitle">Aggregated from verified news agency RSS feeds with direct source attribution</div>
        </div>
      </div>
      <div class="headlines-grid">
        ${this.headlines.slice(0, 6).map(h => this.createHeadlineCardHTML(h)).join('')}
      </div>
    `;
  }

  renderIndiaView(container) {
    const channels = this.allChannels.filter(c => c.country === 'India' && ['National', 'Business', 'Parliament'].includes(c.category));
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🇮🇳 India Live News Directory</h2>
          <div class="section-subtitle">Free, officially available live Indian national news streams (${channels.length} channels)</div>
        </div>
      </div>
      <div class="channel-grid">
        ${channels.map(c => this.createChannelCardHTML(c)).join('')}
      </div>
    `;
  }

  renderRegionalView(container) {
    const languages = [
      { name: 'Hindi', script: 'हिंदी' },
      { name: 'Tamil', script: 'தமிழ்' },
      { name: 'Telugu', script: 'తెలుగు' },
      { name: 'Kannada', script: 'ಕನ್ನಡ' },
      { name: 'Malayalam', script: 'മലയാളം' },
      { name: 'Bengali', script: 'বাংলা' },
      { name: 'Marathi', script: 'मराठी' },
      { name: 'Gujarati', script: 'ગુજરાતી' },
      { name: 'Punjabi', script: 'ਪੰਜਾਬੀ' },
      { name: 'Odia', script: 'ଓଡ଼ିଆ' },
      { name: 'Assamese', script: 'অসমীয়া' },
      { name: 'Urdu', script: 'اردو' }
    ];

    const currentLang = this.selectedRegionalLanguage || 'Hindi';
    const channels = this.allChannels.filter(c => c.language.toLowerCase() === currentLang.toLowerCase());

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🗺️ Regional News - 12 Indian Languages</h2>
          <div class="section-subtitle">Select an Indian language to access verified regional news broadcasts</div>
        </div>
      </div>

      <!-- Language Switcher Bar -->
      <div class="language-pills-wrap" style="margin-bottom: 24px;">
        ${languages.map(l => `
          <button class="pill-btn ${l.name === currentLang ? 'active' : ''}" onclick="window.appState.openRegionalLanguage('${l.name}')">
            ${l.name} (${l.script})
          </button>
        `).join('')}
      </div>

      <div style="margin-bottom: 16px; color: var(--text-muted); font-size: 0.9rem;">
        Showing <strong>${channels.length}</strong> official news stream(s) in <strong>${currentLang}</strong>:
      </div>

      <div class="channel-grid">
        ${channels.length > 0 
          ? channels.map(c => this.createChannelCardHTML(c)).join('') 
          : '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">No channels listed for this language yet.</div>'
        }
      </div>
    `;
  }

  openRegionalLanguage(lang) {
    this.selectedRegionalLanguage = lang;
    this.renderRegionalView(document.getElementById('mainContentView'));
  }

  renderInternationalView(container) {
    const channels = this.allChannels.filter(c => c.category === 'International');
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🌐 International News - English</h2>
          <div class="section-subtitle">Verified global broadcasters broadcasting worldwide in English (${channels.length} channels)</div>
        </div>
      </div>
      <div class="channel-grid">
        ${channels.map(c => this.createChannelCardHTML(c)).join('')}
      </div>
    `;
  }

  renderTrendingView(container) {
    // Sort channels by view_count descending
    const sorted = [...this.allChannels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🔥 Trending News & Broadcasters</h2>
          <div class="section-subtitle">Highest engagement live streams and top headlines right now</div>
        </div>
      </div>
      <div class="channel-grid">
        ${sorted.slice(0, 12).map(c => this.createChannelCardHTML(c)).join('')}
      </div>

      <div class="section-header" style="margin-top: 36px;">
        <div>
          <h2 class="section-title">⚡ Real-time News Feeds</h2>
          <div class="section-subtitle">Latest breaking wire dispatches</div>
        </div>
      </div>
      <div class="headlines-grid">
        ${this.headlines.map(h => this.createHeadlineCardHTML(h)).join('')}
      </div>
    `;
  }

  renderCategoriesView(container) {
    const categories = ['National', 'Regional', 'International', 'Business', 'Parliament', 'Tech & Science'];
    const currentCat = this.selectedCategory || 'National';
    const filtered = this.allChannels.filter(c => c.category.toLowerCase() === currentCat.toLowerCase());

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">📑 News Categories</h2>
          <div class="section-subtitle">Browse channels by specialized news domain</div>
        </div>
      </div>

      <div class="language-pills-wrap" style="margin-bottom: 24px;">
        ${categories.map(cat => `
          <button class="pill-btn ${cat.toLowerCase() === currentCat.toLowerCase() ? 'active' : ''}" onclick="window.appState.selectCategory('${cat}')">
            ${cat}
          </button>
        `).join('')}
      </div>

      <div class="channel-grid">
        ${filtered.map(c => this.createChannelCardHTML(c)).join('')}
      </div>
    `;
  }

  selectCategory(cat) {
    this.selectedCategory = cat;
    this.renderCategoriesView(document.getElementById('mainContentView'));
  }

  renderFavouritesView(container) {
    const favChannels = this.allChannels.filter(c => this.favourites.has(c.id));
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">⭐ My Favourite Channels</h2>
          <div class="section-subtitle">Quick access to your preferred broadcasters (${favChannels.length} channels)</div>
        </div>
      </div>

      ${favChannels.length > 0 ? `
        <div class="channel-grid">
          ${favChannels.map(c => this.createChannelCardHTML(c)).join('')}
        </div>
      ` : `
        <div style="background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 50px 20px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🤍</div>
          <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">No favourite channels saved yet</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 450px; margin: 0 auto 18px;">
            Click the heart icon on any channel card to pin your favourite channels here for instant playback anytime.
          </p>
          <button class="btn-primary" onclick="window.appState.switchTab('home')">Browse News Channels</button>
        </div>
      `}
    `;
  }

  createChannelCardHTML(channel) {
    const isFav = this.isFavourite(channel.id);
    const logoUrl = channel.logo_url || '/static/img/default-tv.svg';

    return `
      <div class="channel-card" onclick="window.playerManager.playChannel(window.appState.getChannelById(${channel.id}))">
        <div class="card-top">
          <span class="live-badge">
            <span class="live-dot"></span>
            LIVE
          </span>
          <button class="fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove Favourite' : 'Add Favourite'}" 
                  onclick="event.stopPropagation(); window.appState.toggleFavourite(${channel.id});">
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <div class="logo-frame">
          <img class="channel-logo-img" src="${logoUrl}" onerror="this.src='/static/img/default-tv.svg'" alt="${channel.channel_name} Logo" loading="lazy">
        </div>

        <div class="card-body">
          <div class="channel-name" title="${channel.channel_name}">${channel.channel_name}</div>
          <div class="meta-badges">
            <span class="meta-pill lang">${channel.language}</span>
            <span class="meta-pill country">${channel.country}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="status-indicator" title="Stream verified officially">
            ● Available
          </span>
          <button class="btn-play-mini" title="Play Stream">▶</button>
        </div>
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

  filterChannelsBySearch(query) {
    const mainView = document.getElementById('mainContentView');
    if (!mainView) return;

    if (!query) {
      this.renderActiveView();
      return;
    }

    const matches = this.allChannels.filter(c => 
      c.channel_name.toLowerCase().includes(query) ||
      c.language.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query) ||
      c.country.toLowerCase().includes(query)
    );

    mainView.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">🔍 Search Results for "${query}"</h2>
          <div class="section-subtitle">Found ${matches.length} matching channel(s)</div>
        </div>
      </div>
      <div class="channel-grid">
        ${matches.length > 0 
          ? matches.map(c => this.createChannelCardHTML(c)).join('')
          : '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">No channels matched your search query. Try another keyword.</div>'
        }
      </div>
    `;
  }

  toggleFavourite(channelId) {
    const isFav = this.favourites.has(channelId);
    if (isFav) {
      this.favourites.delete(channelId);
    } else {
      this.favourites.add(channelId);
    }

    // Save to localStorage
    localStorage.setItem('bharatstream_fav_ids', JSON.stringify([...this.favourites]));

    // Sync with backend API
    fetch('/api/user/favourites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: channelId,
        client_token: this.clientToken
      })
    }).catch(e => console.error('Sync favourite error:', e));

    // Re-render UI elements
    this.renderActiveView();
    if (window.playerManager) {
      window.playerManager.updateFavButtonState();
    }
  }

  isFavourite(channelId) {
    return this.favourites.has(channelId);
  }

  getChannelById(channelId) {
    return this.allChannels.find(c => c.id === channelId);
  }

  checkDeepLinkParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const channelSlug = urlParams.get('channel');
    if (channelSlug) {
      const target = this.allChannels.find(c => c.slug === channelSlug);
      if (target && window.playerManager) {
        setTimeout(() => window.playerManager.playChannel(target), 300);
      }
    }
  }

  checkLastWatchedPrompt() {
    try {
      const saved = localStorage.getItem('bharatstream_last_watched');
      if (saved) {
        const ch = JSON.parse(saved);
        const resumeBox = document.getElementById('resumeWatchingBar');
        if (resumeBox) {
          resumeBox.innerHTML = `
            <div style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); padding: 10px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">📺</span>
                <div>
                  <span style="font-size: 0.82rem; color: var(--text-muted);">Continue watching where you left off:</span>
                  <strong style="color: #fff; margin-left: 6px;">${ch.channel_name} (${ch.language})</strong>
                </div>
              </div>
              <button class="btn-primary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="window.playerManager.playChannel(window.appState.getChannelById(${ch.id}))">
                Resume Stream ▶
              </button>
            </div>
          `;
          resumeBox.style.display = 'block';
        }
      }
    } catch (e) {}
  }
}

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  window.appState = new BharatStreamApp();
});
