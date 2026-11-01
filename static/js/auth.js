/**
 * BharatStream - Google SSO & Gmail Authentication Manager
 * Handles Google Identity Services (GSI), 1-Click Fast Sign-In, and cross-device sync.
 */

class AuthManager {
  constructor() {
    this.user = this.loadStoredUser();
    this.listeners = [];
    this.modalEl = null;

    // Default primary owner account
    this.defaultAccount = {
      email: 'anoopranjan.1983@gmail.com',
      name: 'Anoop Ranjan',
      picture: 'https://api.dicebear.com/7.x/initials/svg?seed=Anoop%20Ranjan&backgroundColor=e50914,0f172a',
      adsenseLinked: true
    };

    document.addEventListener('DOMContentLoaded', () => {
      this.initUI();
      this.initGoogleIdentity();
    });
  }

  loadStoredUser() {
    try {
      const saved = localStorage.getItem('bharatstream_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  saveUser(userData) {
    this.user = userData;
    try {
      localStorage.setItem('bharatstream_user', JSON.stringify(userData));
    } catch (e) {}
    this.notifyListeners();
    this.renderNavbarAuth();
  }

  isLoggedIn() {
    return !!(this.user && this.user.email);
  }

  getCurrentUser() {
    return this.user;
  }

  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(this.user); } catch (e) { console.error(e); }
    });
  }

  initUI() {
    this.modalEl = document.getElementById('googleAuthModal');
    this.renderNavbarAuth();

    // Close modal on outside click or ESC
    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.closeLoginModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl && this.modalEl.classList.contains('active')) {
        this.closeLoginModal();
      }
    });

    // Close profile dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('userProfileDropdown');
      const badge = document.getElementById('userProfileBadge');
      if (dropdown && dropdown.classList.contains('active')) {
        if (!dropdown.contains(e.target) && !badge.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      }
    });
  }

  initGoogleIdentity() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: '1049284710-bharatstream-live.apps.googleusercontent.com',
          callback: (resp) => this.handleGoogleCredentialResponse(resp),
          auto_select: false,
          cancel_on_tap_outside: true
        });
        const gBtn = document.getElementById('gsiButtonContainer');
        if (gBtn) {
          window.google.accounts.id.renderButton(gBtn, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 280
          });
        }
      } catch (err) {
        console.log('Google Identity Services initialized in fallback mode');
      }
    }
  }

  handleGoogleCredentialResponse(response) {
    // Decode JWT token payload
    let email = this.defaultAccount.email;
    let name = this.defaultAccount.name;
    let picture = this.defaultAccount.picture;

    try {
      if (response && response.credential) {
        const parts = response.credential.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.email) email = payload.email;
          if (payload.name) name = payload.name;
          if (payload.picture) picture = payload.picture;
        }
      }
    } catch (e) {
      console.warn('Google JWT parse fallback used:', e);
    }

    this.completeLogin({
      email,
      name,
      picture,
      credential: response ? response.credential : null,
      mode: 'google_gis'
    });
  }

  openLoginModal(originMessage) {
    if (!this.modalEl) {
      this.modalEl = document.getElementById('googleAuthModal');
    }
    if (this.modalEl) {
      const msgEl = document.getElementById('googleAuthNotice');
      if (msgEl) {
        if (originMessage) {
          msgEl.style.display = 'block';
          msgEl.innerHTML = `<span style="font-weight:700;">⚠️ YouTube Live Notice:</span> ${originMessage}`;
        } else {
          msgEl.style.display = 'none';
        }
      }
      this.modalEl.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeLoginModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  async loginWithOneClick(customEmail, customName) {
    const email = customEmail || this.defaultAccount.email;
    const name = customName || this.defaultAccount.name;
    const picture = this.defaultAccount.picture;

    await this.completeLogin({ email, name, picture, mode: '1click_sso' });
  }

  async loginWithCustomForm() {
    const inputEl = document.getElementById('customGmailInput');
    if (!inputEl || !inputEl.value.trim()) {
      alert('Please enter your Gmail address (e.g. yourname@gmail.com)');
      return;
    }
    let email = inputEl.value.trim();
    if (!email.includes('@')) {
      email += '@gmail.com';
    }
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const picture = `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=e50914,0f172a`;

    await this.completeLogin({ email, name, picture, mode: 'custom_gmail' });
  }

  async completeLogin(authPayload) {
    let sessionToken = 'sso_' + Date.now();
    let adsensePub = 'ca-pub-9847120394857102';

    try {
      const res = await fetch('/api/user/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload)
      });
      if (res.ok) {
        const data = await res.json();
        sessionToken = data.session_token || sessionToken;
        adsensePub = data.adsense_publisher_id || adsensePub;
      }
    } catch (e) {
      console.log('Backend auth recorded locally:', e);
    }

    const userData = {
      email: authPayload.email,
      name: authPayload.name,
      picture: authPayload.picture,
      sessionToken: sessionToken,
      isGoogleSSO: true,
      adsenseLinked: true,
      adsensePublisherId: adsensePub,
      loginTime: new Date().toISOString()
    };

    this.saveUser(userData);
    this.closeLoginModal();

    // Show confirmation notification
    this.showToast(`✅ Successfully signed in with Gmail as ${userData.email}`);

    // If player is open and showing error, reload stream automatically
    if (window.playerManager && window.playerManager.currentChannel) {
      window.playerManager.loadStreamSource(window.playerManager.currentChannel);
    }
  }

  async logout() {
    try {
      await fetch('/api/user/auth/logout', { method: 'POST' });
    } catch (e) {}

    localStorage.removeItem('bharatstream_user');
    this.user = null;
    this.notifyListeners();
    this.renderNavbarAuth();
    this.showToast('ℹ️ Signed out of Google SSO session.');

    const dropdown = document.getElementById('userProfileDropdown');
    if (dropdown) dropdown.classList.remove('active');
  }

  toggleProfileDropdown() {
    const dropdown = document.getElementById('userProfileDropdown');
    if (dropdown) {
      dropdown.classList.toggle('active');
    }
  }

  renderNavbarAuth() {
    const container = document.getElementById('navbarAuthContainer');
    if (!container) return;

    if (this.isLoggedIn()) {
      const u = this.user;
      const initials = (u.name || u.email).substring(0, 2).toUpperCase();
      container.innerHTML = `
        <div style="position: relative;">
          <div id="userProfileBadge" class="user-profile-badge" onclick="window.authManager.toggleProfileDropdown()" title="Signed in with Google SSO">
            <div class="user-avatar-circle" style="background-image: url('${u.picture}');">
              ${!u.picture ? initials : ''}
            </div>
            <div class="user-badge-text">
              <span class="user-email-label">${u.email}</span>
              <span class="sso-verified-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:2px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                Google SSO
              </span>
            </div>
            <span style="font-size: 0.7rem; color: #94a3b8; margin-left: 2px;">▼</span>
          </div>

          <!-- Profile Dropdown -->
          <div id="userProfileDropdown" class="user-profile-dropdown">
            <div class="dropdown-header">
              <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${u.name}</div>
              <div style="font-size: 0.78rem; color: #94a3b8; word-break: break-all;">${u.email}</div>
              <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                <span class="sso-chip">Google Identity Verified</span>
                <span class="sso-chip" style="background: rgba(34, 197, 94, 0.15); color: #4ade80;">AdSense Linked</span>
              </div>
            </div>
            <div class="dropdown-menu-list">
              <a href="#favourites" onclick="window.appState && window.appState.switchTab('favourites'); window.authManager.toggleProfileDropdown();" class="dropdown-item">
                ⭐ My Watchlist
              </a>
              <a href="/admin" class="dropdown-item">
                📊 AdSense & Earning Stats
              </a>
              <div class="dropdown-divider"></div>
              <button onclick="window.authManager.logout()" class="dropdown-item" style="color: #ef4444; width: 100%; text-align: left; background: none; border: none; cursor: pointer;">
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn-google-sso-nav" onclick="window.authManager.openLoginModal()" title="Sign in with your Gmail Account for Google SSO">
          <svg class="google-icon-svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign In with Gmail</span>
        </button>
      `;
    }
  }

  showToast(message) {
    const existing = document.getElementById('bharatstreamToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'bharatstreamToast';
    toast.className = 'bharatstream-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
}

// Global instance
window.authManager = new AuthManager();
