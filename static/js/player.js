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

    this.streamSwitcherEl.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        <button class="pill-btn active" onclick="window.playerManager.loadStreamSource(window.playerManager.currentChannel)">
          ▶ Embedded Stream
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
    if (streamType === 'youtube_live') {
      let src = '';
      if (videoId) {
        src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
      } else if (chId) {
        src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${chId}&autoplay=1`;
      } else if (embedUrl) {
        src = embedUrl;
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
        iframe.onerror = () => this.showFallbackScreen(channel);
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
            this.showFallbackScreen(channel);
          }
        });
        this.hlsInstance = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = embedUrl;
        video.play();
      } else {
        this.showFallbackScreen(channel);
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

    this.showFallbackScreen(channel);
  }

  showFallbackScreen(channel) {
    const ytUrl = channel.video_id ? `https://www.youtube.com/watch?v=${channel.video_id}` : (channel.official_youtube_channel || 'https://www.youtube.com');
    const portalUrl = channel.fallback_url || channel.official_website || ytUrl;

    this.videoContainer.innerHTML = `
      <div class="fallback-stream-card">
        <div style="font-size: 2.4rem; margin-bottom: 8px;">📡</div>
        <h3 class="fallback-title">${channel.channel_name} Live Broadcast</h3>
        <p class="fallback-desc">
          Official broadcaster direct stream available. If playback is restricted in external embeds, watch directly on official channels below.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 20px; background: #dc2626;">
            Watch Live on YouTube ↗
          </a>
          <a href="${portalUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 20px;">
            Watch on Official Website ↗
          </a>
          <button class="btn-outline" onclick="window.playerManager.loadStreamSource(window.playerManager.currentChannel)">
            Retry Embed ⟳
          </button>
        </div>
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
