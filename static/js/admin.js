/**
 * BharatStream - Admin & Monetization Dashboard Controller (Pure JSON Storage)
 */

class BharatStreamAdmin {
  constructor() {
    this.token = localStorage.getItem('bharatstream_admin_token') || 'bs-admin-sec-key-998877';
    this.channels = [];
    this.categories = [];
    this.healthLogs = [];
    this.reports = [];
    this.ads = [];

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadAllData();
  }

  bindEvents() {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sectionId = btn.dataset.section;
        document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
        const target = document.getElementById(sectionId);
        if (target) target.style.display = 'block';
      });
    });

    const channelForm = document.getElementById('channelModalForm');
    if (channelForm) {
      channelForm.addEventListener('submit', (e) => this.handleSaveChannel(e));
    }

    const verifyBtn = document.getElementById('btnRunVerification');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => this.runStreamVerification());
    }

    const searchInput = document.getElementById('adminChannelSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterChannelsTable(e.target.value.toLowerCase()));
    }
  }

  async loadAllData() {
    await Promise.all([
      this.fetchStats(),
      this.fetchChannels(),
      this.fetchHealthLogs(),
      this.fetchReports(),
      this.fetchAds()
    ]);
  }

  async fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const stats = await res.json();
        document.getElementById('statTotalChannels').textContent = stats.total_channels;
        document.getElementById('statActiveChannels').textContent = stats.active_channels;
        document.getElementById('statAdImpressions').textContent = stats.total_ad_impressions?.toLocaleString() || '0';
        document.getElementById('statAdClicks').textContent = stats.total_ad_clicks?.toLocaleString() || '0';
        document.getElementById('statEarningsUSD').textContent = `$${stats.estimated_earnings_usd?.toFixed(2) || '0.00'}`;
        document.getElementById('statEarningsINR').textContent = `₹${stats.estimated_earnings_inr?.toFixed(2) || '0.00'}`;
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }

  async fetchChannels() {
    try {
      const res = await fetch('/api/admin/channels');
      if (res.ok) {
        this.channels = await res.json();
        this.renderChannelsTable(this.channels);
      }
    } catch (e) {
      console.error('Error loading channels:', e);
    }
  }

  async fetchHealthLogs() {
    try {
      const res = await fetch('/api/admin/health-logs?limit=40');
      if (res.ok) {
        this.healthLogs = await res.json();
        this.renderHealthLogsTable(this.healthLogs);
      }
    } catch (e) {
      console.error('Error loading health logs:', e);
    }
  }

  async fetchReports() {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        this.reports = await res.json();
        this.renderReportsTable(this.reports);
      }
    } catch (e) {
      console.error('Error loading reports:', e);
    }
  }

  async fetchAds() {
    try {
      const res = await fetch('/api/admin/ads');
      if (res.ok) {
        this.ads = await res.json();
        this.renderAdsManagement(this.ads);
      }
    } catch (e) {
      console.error('Error loading ads:', e);
    }
  }

  renderChannelsTable(list) {
    const tbody = document.getElementById('adminChannelsTbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(c => `
      <tr>
        <td><strong>#${c.id}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${c.logo_url || '/static/img/default-tv.svg'}" onerror="this.src='/static/img/default-tv.svg'" style="width: 28px; height: 28px; object-fit: contain; background: #0f172a; border-radius: 4px; padding: 2px;">
            <span>${c.channel_name}</span>
          </div>
        </td>
        <td><span class="meta-pill lang">${c.language}</span></td>
        <td>${c.country}</td>
        <td>${c.category}</td>
        <td><code>${c.stream_type}</code></td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 4px; color: ${c.verification_status === 'healthy' ? '#10b981' : '#f59e0b'}; font-weight: 600; font-size: 0.8rem;">
            ● ${c.verification_status}
          </span>
        </td>
        <td>
          <span style="color: ${c.is_active ? '#10b981' : '#ef4444'}; font-size: 0.85rem;">
            ${c.is_active ? 'Active' : 'Disabled'}
          </span>
        </td>
        <td>
          <button class="btn-outline" style="padding: 3px 8px; font-size: 0.75rem;" onclick="window.adminApp.openEditModal(${c.id})">Edit</button>
          <button class="btn-outline" style="padding: 3px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239,68,68,0.3);" onclick="window.adminApp.deleteChannel(${c.id})">Delete</button>
          <button class="btn-outline" style="padding: 3px 8px; font-size: 0.75rem; color: #3b82f6;" onclick="window.adminApp.verifySingleChannel(${c.id})">Verify</button>
        </td>
      </tr>
    `).join('');
  }

  filterChannelsTable(query) {
    if (!query) {
      this.renderChannelsTable(this.channels);
      return;
    }
    const filtered = this.channels.filter(c => 
      c.channel_name.toLowerCase().includes(query) ||
      c.language.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query)
    );
    this.renderChannelsTable(filtered);
  }

  renderHealthLogsTable(logs) {
    const tbody = document.getElementById('adminLogsTbody');
    if (!tbody) return;

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px;">No audit logs recorded yet in data/health_logs.json.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><strong>#${l.id}</strong></td>
        <td>${l.channel_name || '#' + l.channel_id}</td>
        <td>
          <span style="color: ${l.status === 'healthy' ? '#10b981' : '#f59e0b'}; font-weight: 600;">
            ${l.status.toUpperCase()}
          </span>
        </td>
        <td><code>${l.http_code || 'OK'}</code></td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${l.error_message || 'Stream reachable & verified.'}</td>
        <td style="font-size: 0.75rem; color: var(--text-dim);">${new Date(l.checked_at).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  renderReportsTable(reports) {
    const tbody = document.getElementById('adminReportsTbody');
    if (!tbody) return;

    if (!reports.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #10b981; padding: 24px;">✓ All viewer reports in data/reports.json are resolved!</td></tr>';
      return;
    }

    tbody.innerHTML = reports.map(r => `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>${r.channel_name}</td>
        <td><span class="meta-pill" style="background: rgba(239,68,68,0.2); color: #fca5a5;">${r.issue_type}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-main);">${r.comment || 'No comment provided'}</td>
        <td style="font-size: 0.75rem; color: var(--text-dim);">${new Date(r.reported_at).toLocaleString()}</td>
        <td>
          <button class="btn-primary" style="padding: 3px 10px; font-size: 0.75rem;" onclick="window.adminApp.resolveReport(${r.id})">
            Resolve ✓
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderAdsManagement(ads) {
    const container = document.getElementById('adsManagementContainer');
    if (!container) return;

    container.innerHTML = ads.map(a => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: #fff;">${a.title}</h4>
            <span style="font-size: 0.78rem; color: var(--text-dim);">Slot: <code>${a.slot_name}</code> • Impressions: <strong>${a.impressions || 0}</strong> • Clicks: <strong>${a.clicks || 0}</strong> • Est. CPM: <strong>$${a.estimated_cpm || 2.0}</strong></span>
          </div>
          <div>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" ${a.is_enabled ? 'checked' : ''} onchange="window.adminApp.toggleAdSlot('${a.slot_name}', this.checked)">
              <span style="font-size: 0.88rem; font-weight: 600; color: ${a.is_enabled ? '#10b981' : '#ef4444'};">
                ${a.is_enabled ? 'Active / Serving' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 0.85rem; margin-bottom: 12px;">
          <div>
            <label style="color: var(--text-dim); display: block; margin-bottom: 4px;">Ad Headline / Text</label>
            <input type="text" value="${a.headline || ''}" id="adHeadline_${a.slot_name}" class="search-input" style="border-radius: 6px; padding: 6px 12px;">
          </div>
          <div>
            <label style="color: var(--text-dim); display: block; margin-bottom: 4px;">Target / Affiliate URL</label>
            <input type="text" value="${a.target_url || ''}" id="adTarget_${a.slot_name}" class="search-input" style="border-radius: 6px; padding: 6px 12px;">
          </div>
          <div>
            <label style="color: var(--text-dim); display: block; margin-bottom: 4px;">Banner Image URL</label>
            <input type="text" value="${a.image_url || ''}" id="adImage_${a.slot_name}" class="search-input" style="border-radius: 6px; padding: 6px 12px;">
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="color: var(--text-dim); display: block; margin-bottom: 4px; font-size: 0.82rem;">Custom HTML / Google AdSense Ad Unit Code (Optional)</label>
          <textarea id="adHtml_${a.slot_name}" class="form-input" rows="2" placeholder="<ins class='adsbygoogle' ...></ins>">${a.html_code || ''}</textarea>
        </div>

        <div style="text-align: right;">
          <button class="btn-primary" style="padding: 6px 16px; font-size: 0.82rem;" onclick="window.adminApp.saveAdSlot('${a.slot_name}')">
            Save Slot Settings to JSON
          </button>
        </div>
      </div>
    `).join('');
  }

  async toggleAdSlot(slotName, isEnabled) {
    try {
      await fetch(`/api/admin/ads/${slotName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: isEnabled })
      });
      this.fetchAds();
      this.fetchStats();
    } catch (e) {
      alert('Error updating ad status');
    }
  }

  async saveAdSlot(slotName) {
    const headline = document.getElementById(`adHeadline_${slotName}`).value;
    const targetUrl = document.getElementById(`adTarget_${slotName}`).value;
    const imageUrl = document.getElementById(`adImage_${slotName}`).value;
    const htmlCode = document.getElementById(`adHtml_${slotName}`).value;

    try {
      const res = await fetch(`/api/admin/ads/${slotName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline,
          target_url: targetUrl,
          image_url: imageUrl,
          html_code: htmlCode
        })
      });
      if (res.ok) {
        alert(`Monetization slot "${slotName}" saved successfully.`);
        this.fetchAds();
        this.fetchStats();
      }
    } catch (e) {
      alert('Failed to save ad slot: ' + e);
    }
  }

  async runStreamVerification() {
    const btn = document.getElementById('btnRunVerification');
    const statusBox = document.getElementById('verifierProgressStatus');
    if (btn) btn.disabled = true;
    if (statusBox) {
      statusBox.innerHTML = '<span style="color: #60a5fa;">⏳ Verifying all streams via YouTube oEmbed & broadcaster endpoints...</span>';
      statusBox.style.display = 'block';
    }

    try {
      const res = await fetch('/api/admin/verify', { method: 'POST' });
      const data = await res.json();
      if (statusBox) {
        statusBox.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; color: #10b981;">
            ✓ Completed verification of <strong>${data.verified_count}</strong> channels! Audit saved in <code>data/health_logs.json</code>.
          </div>
        `;
      }
      await this.loadAllData();
    } catch (e) {
      if (statusBox) statusBox.innerHTML = `<span style="color: #ef4444;">Verification error: ${e}</span>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async verifySingleChannel(channelId) {
    try {
      const res = await fetch(`/api/admin/verify?channel_id=${channelId}`, { method: 'POST' });
      const data = await res.json();
      alert(`Channel #${channelId} verified: ${data.details[0]?.status}`);
      this.loadAllData();
    } catch (e) {
      alert('Verification failed: ' + e);
    }
  }

  openAddModal() {
    document.getElementById('modalFormTitle').textContent = 'Add New News Channel (to JSON)';
    document.getElementById('editChannelId').value = '';
    document.getElementById('fChannelName').value = '';
    document.getElementById('fSlug').value = '';
    document.getElementById('fCountry').value = 'India';
    document.getElementById('fLanguage').value = 'Hindi';
    document.getElementById('fCategory').value = 'National';
    document.getElementById('fStreamType').value = 'youtube_live';
    document.getElementById('fVideoId').value = '';
    document.getElementById('fChannelId').value = '';
    document.getElementById('fEmbedUrl').value = '';
    document.getElementById('fLogoUrl').value = '';
    document.getElementById('fWebsite').value = '';
    document.getElementById('fFallbackUrl').value = '';
    document.getElementById('fDesc').value = '';
    document.getElementById('fIsActive').checked = true;

    document.getElementById('channelModal').style.display = 'flex';
  }

  openEditModal(channelId) {
    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) return;

    document.getElementById('modalFormTitle').textContent = `Edit Channel: ${ch.channel_name}`;
    document.getElementById('editChannelId').value = ch.id;
    document.getElementById('fChannelName').value = ch.channel_name;
    document.getElementById('fSlug').value = ch.slug;
    document.getElementById('fCountry').value = ch.country;
    document.getElementById('fLanguage').value = ch.language;
    document.getElementById('fCategory').value = ch.category;
    document.getElementById('fStreamType').value = ch.stream_type;
    document.getElementById('fVideoId').value = ch.video_id || '';
    document.getElementById('fChannelId').value = ch.youtube_channel_id || '';
    document.getElementById('fEmbedUrl').value = ch.authorized_embed_url || '';
    document.getElementById('fLogoUrl').value = ch.logo_url || '';
    document.getElementById('fWebsite').value = ch.official_website || '';
    document.getElementById('fFallbackUrl').value = ch.fallback_url || '';
    document.getElementById('fDesc').value = ch.description || '';
    document.getElementById('fIsActive').checked = ch.is_active;

    document.getElementById('channelModal').style.display = 'flex';
  }

  closeModal() {
    document.getElementById('channelModal').style.display = 'none';
  }

  async handleSaveChannel(e) {
    e.preventDefault();
    const id = document.getElementById('editChannelId').value;
    const payload = {
      channel_name: document.getElementById('fChannelName').value,
      slug: document.getElementById('fSlug').value,
      country: document.getElementById('fCountry').value,
      language: document.getElementById('fLanguage').value,
      category: document.getElementById('fCategory').value,
      stream_type: document.getElementById('fStreamType').value,
      video_id: document.getElementById('fVideoId').value,
      youtube_channel_id: document.getElementById('fChannelId').value,
      authorized_embed_url: document.getElementById('fEmbedUrl').value,
      logo_url: document.getElementById('fLogoUrl').value,
      official_website: document.getElementById('fWebsite').value,
      fallback_url: document.getElementById('fFallbackUrl').value,
      description: document.getElementById('fDesc').value,
      is_active: document.getElementById('fIsActive').checked
    };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/admin/channels/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        alert('Channel saved to JSON database.');
        this.closeModal();
        this.loadAllData();
      } else {
        const err = await res.json();
        alert('Save failed: ' + (err.detail || 'Validation error'));
      }
    } catch (e) {
      alert('Error saving channel: ' + e);
    }
  }

  async deleteChannel(id) {
    if (!confirm(`Are you sure you want to permanently delete Channel #${id} from JSON storage?`)) return;

    try {
      const res = await fetch(`/api/admin/channels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Channel deleted.');
        this.loadAllData();
      }
    } catch (e) {
      alert('Delete failed: ' + e);
    }
  }

  async resolveReport(reportId) {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, { method: 'POST' });
      if (res.ok) {
        alert('Report marked as resolved in JSON.');
        this.fetchReports();
        this.fetchStats();
      }
    } catch (e) {
      alert('Resolve error: ' + e);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new BharatStreamAdmin();
});
