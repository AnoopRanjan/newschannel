/**
 * BharatStream - Live Video Streaming Engine
 * Supports: YouTube IFrame API, YouTube Channel Live Streams, HLS.js (.m3u8), and Official Broadcaster Portals.
 */

class StreamPlayerManager {
  constructor() {
    this.currentChannel = null;
    this.hlsInstance = null;
    this.modalEl = document.getElementById('playerModal');
    this.dialogEl = document.getElementById('playerDialog');
    this.videoContainer = document.getElementById('videoContainer');
    this.channelTitleEl = document.getElementById('playerChannelTitle');
    this.channelMetaEl = document.getElementById('playerChannelMeta');
    this.channelDescEl = document.getElementById('playerChannelDesc');
    this.favBtn = document.getElementById('playerFavBtn');
    this.lastVerifiedEl = document.getElementById('playerVerifiedStatus');
    this.streamSwitcherEl = document.getElementById('streamSourceSwitcher');
    this.isTheatreMode = false;

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = document.getElementById('closePlayerBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closePlayer());

    const theatreBtn = document.getElementById('theatreModeBtn');
    if (theatreBtn) theatreBtn.addEventListener('click', () => this.toggleTheatreMode());

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    const shareBtn = document.getElementById('shareStreamBtn');
    if (shareBtn) shareBtn.addEventListener('click', () => this.shareChannel());

    const reportBtn = document.getElementById('reportStreamBtn');
    if (reportBtn) reportBtn.addEventListener('click', () => this.openReportModal());

    const popoutBtn = document.getElementById('popoutPlayerBtn');
    if (popoutBtn) popoutBtn.addEventListener('click', () => this.openPopoutWindow());

    if (this.favBtn) {
      this.favBtn.addEventListener('click', () => {
        if (this.currentChannel && window.appState) {
          window.appState.toggleFavourite(this.currentChannel.id);
          this.updateFavButtonState();
        }
      });
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.closePlayer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (!this.modalEl || !this.modalEl.classList.contains('active')) return;
      if (e.key === 'Escape') this.closePlayer();
      if (e.key === 't' || e.key === 'T') this.toggleTheatreMode();
      if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
    });
  }

  playChannel(channel) {
    if (!channel) return;
    this.currentChannel = channel;

    // Track ad impression for below player and sidebar ads
    if (window.appState) {
      window.appState.trackAdEvent('player_below_ad', false);
      window.appState.trackAdEvent('sidebar_ad', false);
    }

    // Save as last watched channel for auto-resume
    try {
      localStorage.setItem('bharatstream_last_watched', JSON.stringify(channel));
    } catch (e) {}

    // Update metadata
    if (this.channelTitleEl) this.channelTitleEl.textContent = channel.channel_name;
    if (this.channelMetaEl) {
      this.channelMetaEl.textContent = `${channel.language} • ${channel.country} • ${channel.category}`;
    }
    if (this.channelDescEl) {
      this.channelDescEl.textContent = channel.description || `Official live stream broadcast by ${channel.channel_name}.`;
    }
    if (this.lastVerifiedEl) {
      this.lastVerifiedEl.innerHTML = `<span class="status-indicator">● ${channel.verification_status === 'healthy' ? 'Verified Official Broadcaster' : 'Broadcaster Live'}</span>`;
    }

    this.updateFavButtonState();
    this.renderStreamSwitcher(channel);
    this.loadStreamSource(channel);
    this.loadRelatedChannels(channel);

    if (this.modalEl) {
      this.modalEl.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  renderStreamSwitcher(channel) {
    if (!this.streamSwitcherEl) return;
    const ytLiveUrl = channel.video_id 
      ? `https://www.youtube.com/watch?v=${channel.video_id}` 
      : (channel.official_youtube_channel || 'https://www.youtube.com');
    const portalUrl = channel.official_website || channel.fallback_url || ytLiveUrl;
    const user = window.authManager ? window.authManager.getCurrentUser() : null;

    this.streamSwitcherEl.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; align-items: center;">
        <button class="pill-btn active" onclick="window.playerManager.loadStreamSource(window.playerManager.currentChannel)">
          ▶ Embedded Stream
        </button>
        <button class="pill-btn" onclick="window.playerManager.showFallbackScreen(window.playerManager.currentChannel)" style="background: rgba(66, 133, 244, 0.15); color: #60a5fa; border: 1px solid rgba(66, 133, 244, 0.4);">
          🔑 ${user ? 'Google SSO: ' + user.email.split('@')[0] : 'Sign In with Gmail / SSO'}
        </button>
        <a class="pill-btn" href="${ytLiveUrl}" target="_blank" rel="noopener noreferrer">
          🔴 Official YouTube Live ↗
        </a>
        <a class="pill-btn" href="${portalUrl}" target="_blank" rel="noopener noreferrer">
          🌐 Broadcaster Portal ↗
        </a>
      </div>
    `;
  }

  loadStreamSource(channel) {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    this.videoContainer.innerHTML = '';

    const streamType = channel.stream_type || 'youtube_live';
    const videoId = channel.video_id;
    const chId = channel.youtube_channel_id;
    const embedUrl = channel.authorized_embed_url;

    // 1. YouTube Live Stream
    if (streamType === 'youtube_live' || (!streamType && (videoId || chId || embedUrl))) {
      let src = '';
      if (embedUrl && embedUrl.includes('youtube')) {
        src = embedUrl;
      } else if (videoId && !videoId.includes('-live')) {
        src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
      } else if (chId) {
        src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${chId}&autoplay=1`;
      } else if (embedUrl) {
        src = embedUrl;
      } else if (videoId) {
        src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
      }

      if (src) {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', src);
        iframe.setAttribute('title', `${channel.channel_name} Live Broadcast`);
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('loading', 'eager');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        // Error detection fallback
        iframe.onerror = () => this.showFallbackScreen(channel, 'Embedded player load error');
        this.videoContainer.appendChild(iframe);
        return;
      }
    }

    // 2. Authorized HLS Stream
    if (streamType === 'hls' && embedUrl) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.height = '100%';

      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(embedUrl);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play());
        hls.on(window.Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            this.showFallbackScreen(channel, 'HLS playback error');
          }
        });
        this.hlsInstance = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = embedUrl;
        video.play();
      } else {
        this.showFallbackScreen(channel, 'HLS format unsupported');
      }
      this.videoContainer.appendChild(video);
      return;
    }

    // 3. Official Broadcaster Embed
    if (streamType === 'official_embed' && embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', embedUrl);
      iframe.setAttribute('title', channel.channel_name);
      iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      this.videoContainer.appendChild(iframe);
      return;
    }

    this.showFallbackScreen(channel, 'No authorized stream source found');
  }

  showFallbackScreen(channel, errorReason = '') {
    const ytUrl = channel.video_id ? `https://www.youtube.com/watch?v=${channel.video_id}` : (channel.official_youtube_channel || 'https://www.youtube.com');
    const portalUrl = channel.fallback_url || channel.official_website || ytUrl;
    const user = window.authManager ? window.authManager.getCurrentUser() : null;
    const isLoggedIn = !!(user && user.email);

    this.videoContainer.innerHTML = `
      <div class="fallback-stream-card">
        <div class="google-sso-lock-badge">
          <svg class="google-icon-svg" viewBox="0 0 24 24" width="34" height="34">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
        </div>

        <h3 class="fallback-title">${channel.channel_name} Live Broadcast</h3>

        <div class="google-sso-alert-box">
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px; font-size: 0.95rem;">
            🔒 YouTube Live Embed Restricted or Google Sign-In Required
          </div>
          <p class="fallback-desc" style="margin-bottom: 0;">
            This broadcaster stream may require Google authentication, or third-party embedded players have been disabled by the video owner. 
            Sign in with your Gmail Account (Google SSO) to authorize playback or watch directly on YouTube with your signed-in Google account.
          </p>
        </div>

        ${isLoggedIn ? `
          <div class="user-active-sso-box">
            <span style="font-size: 1.2rem;">✅</span>
            <div style="text-align: left;">
              <div style="font-weight: 700; color: #4ade80; font-size: 0.88rem;">Google SSO Session Active: ${user.email}</div>
              <div style="font-size: 0.76rem; color: #94a3b8;">Google Identity verified. Open directly on YouTube with your authenticated session to bypass embed blocks.</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 14px;">
            <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 22px; background: #dc2626; display: flex; align-items: center; gap: 8px;">
              <span>🔴</span> Watch on YouTube (Signed-In) ↗
            </a>
            <a href="${portalUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 20px;">
              🌐 Official Broadcaster Portal ↗
            </a>
            <button class="btn-outline" onclick="window.playerManager.loadStreamSource(window.playerManager.currentChannel)">
              🔄 Retry Embed
            </button>
          </div>
        ` : `
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 16px;">
            <button class="btn-google-sso-large" onclick="window.authManager.openLoginModal('Broadcaster requires Google/Gmail authorization')">
              <svg class="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign In with Gmail (Google SSO)</span>
            </button>
            <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 20px; background: #dc2626;">
              Watch Live on YouTube ↗
            </a>
            <a href="${portalUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 20px;">
              Watch on Broadcaster Website ↗
            </a>
            <button class="btn-outline" onclick="window.playerManager.loadStreamSource(window.playerManager.currentChannel)">
              Retry Embed ⟳
            </button>
          </div>
        `}
      </div>
    `;
  }

  loadRelatedChannels(channel) {
    const listEl = document.getElementById('relatedChannelsList');
    if (!listEl || !window.appState || !window.appState.allChannels) return;

    const related = window.appState.allChannels
      .filter(c => c.id !== channel.id && (c.language === channel.language || c.category === channel.category))
      .slice(0, 8);

    if (related.length === 0) {
      listEl.innerHTML = '<div style="padding: 16px; color: var(--text-dim); font-size: 0.82rem;">No related channels.</div>';
      return;
    }

    listEl.innerHTML = related.map(c => `
      <div class="related-ch-item" onclick="window.playerManager.playChannel(window.appState.getChannelById(${c.id}))">
        <img class="related-logo" src="${c.logo_url || '/static/img/default-tv.svg'}" onerror="this.src='/static/img/default-tv.svg'" alt="${c.channel_name}">
        <div>
          <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">${c.channel_name}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${c.language} • ${c.category}</div>
        </div>
      </div>
    `).join('');
  }

  updateFavButtonState() {
    if (!this.favBtn || !this.currentChannel || !window.appState) return;
    const isFav = window.appState.isFavourite(this.currentChannel.id);
    this.favBtn.innerHTML = isFav ? '❤️' : '🤍';
    this.favBtn.title = isFav ? 'Remove from Favourites' : 'Add to Favourites';
  }

  toggleTheatreMode() {
    this.isTheatreMode = !this.isTheatreMode;
    if (this.dialogEl) {
      this.dialogEl.classList.toggle('theatre-mode', this.isTheatreMode);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (this.videoContainer.requestFullscreen) {
        this.videoContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  openPopoutWindow() {
    if (!this.currentChannel) return;
    const embedUrl = this.currentChannel.authorized_embed_url || `https://www.youtube.com/embed/${this.currentChannel.video_id}?autoplay=1`;
    window.open(embedUrl, '_blank', 'width=854,height=480,menubar=no,toolbar=no,location=no,status=no');
  }

  shareChannel() {
    if (!this.currentChannel) return;
    const url = `${window.location.origin}/?channel=${this.currentChannel.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert(`Channel link copied to clipboard:\n${url}`);
      }).catch(() => {
        prompt('Copy this channel stream link:', url);
      });
    } else {
      prompt('Copy this channel stream link:', url);
    }
  }

  openReportModal() {
    if (!this.currentChannel) return;
    const reason = prompt(
      `Report stream issue for "${this.currentChannel.channel_name}":\n\n1. stream_offline\n2. audio_issue\n3. geo_blocked\n4. other\n\nEnter number or comment:`
    );
    if (!reason) return;

    let issue_type = 'stream_offline';
    if (reason === '2') issue_type = 'audio_issue';
    else if (reason === '3') issue_type = 'geo_blocked';
    else if (reason === '4') issue_type = 'other';

    fetch('/api/user/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: this.currentChannel.id,
        issue_type: issue_type,
        comment: reason
      })
    })
    .then(r => r.json())
    .then(() => alert('Thank you. Your report has been submitted to system administration for verification.'))
    .catch(err => alert('Could not submit report: ' + err));
  }

  closePlayer() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.videoContainer) {
      this.videoContainer.innerHTML = '';
    }
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentChannel = null;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.playerManager = new StreamPlayerManager();
});
