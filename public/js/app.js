const API = '';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}

/* ── Formatters ─────────────────────────────────────── */
function fmtInstalls(n) {
  if (n == null) return '—';
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B+';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M+';
  if (n >= 1e3) return (n/1e3).toFixed(0)+'K+';
  return n.toLocaleString();
}
function fmtNum(n)    { return n == null ? '—' : n.toLocaleString(); }
function fmtRating(r) { return r ? parseFloat(r).toFixed(1) : '—'; }
function fmtDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}

/* ── Badges ─────────────────────────────────────────── */
function makeBadges(app) {
  const b = [];
  if (app._isNew)       b.push(`<span class="badge badge-new">NEW</span>`);
  if (app.free != null) b.push(app.free ? `<span class="badge badge-green">Free</span>` : `<span class="badge badge-yellow">Paid ${app.priceText||''}</span>`);
  if (app.editorsChoice) b.push(`<span class="badge badge-blue">Editor's choice</span>`);
  if (app.offersIAP)     b.push(`<span class="badge badge-orange">IAP</span>`);
  if (app.adSupported)   b.push(`<span class="badge badge-gray">Ads</span>`);
  if (app.contentRating) b.push(`<span class="badge badge-gray">${app.contentRating}</span>`);
  if (app.genre)         b.push(`<span class="badge badge-blue">${app.genre}</span>`);
  return b.join('');
}

function iconEl(app) {
  return app.icon
    ? `<img class="app-icon" src="${app.icon}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="app-icon-fallback" style="display:none">📱</div>`
    : `<div class="app-icon-fallback">📱</div>`;
}

/* ── App Card ───────────────────────────────────────── */
function appCard(app, rank) {
  const relStr = app.released ? fmtDate(app.released) : (app.updated ? fmtDate(app.updated)+' *' : '—');
  return `
<div class="app-card" onclick="openDetail('${app.appId}')">
  <div class="card-top">
    <div>${iconEl(app)}</div>
    <div class="card-info">
      <div class="card-title">${app.title||'Unknown'}</div>
      <div class="card-dev">${app.developer||'—'}</div>
      <div class="card-badges">${makeBadges(app)}</div>
    </div>
    ${rank != null ? `<div class="rank-badge">#${rank+1}</div>` : ''}
  </div>
  <div class="card-stats">
    <div class="stat-box"><div class="stat-label">Installs</div><div class="stat-value green">${fmtInstalls(app.minInstalls)}</div></div>
    <div class="stat-box"><div class="stat-label">Rating</div><div class="stat-value yellow">${fmtRating(app.score)}</div></div>
    <div class="stat-box"><div class="stat-label">Released</div><div class="stat-value">${relStr}</div></div>
    <div class="stat-box"><div class="stat-label">Updated</div><div class="stat-value">${fmtDate(app.updated)}</div></div>
  </div>
  ${app.summary?`<div class="card-summary">${app.summary}</div>`:''}
</div>`;
}

/* ── Detail Modal ───────────────────────────────────── */
function detailView(app) {
  const icon = app.icon ? `<img class="detail-icon" src="${app.icon}" alt=""/>` : `<div class="detail-icon-fallback">📱</div>`;
  const screenshots = app.screenshots?.length
    ? `<div class="detail-section-title">Screenshots</div><div class="screenshots-row">${app.screenshots.map(s=>`<img class="screenshot" src="${s}"/>`).join('')}</div>` : '';
  return `
<div class="detail-card">
  <div class="detail-hero">${icon}
    <div>
      <div class="detail-title">${app.title||'Unknown'}</div>
      <div class="detail-dev">${app.developer||'—'} · <span style="color:var(--text3);font-size:11px;font-family:var(--mono)">${app.appId||''}</span></div>
      <div class="detail-badges">${makeBadges(app)}</div>
    </div>
  </div>
  <div class="detail-stats">
    <div class="dstat"><div class="dstat-label">Installs</div><div class="dstat-value green">${fmtInstalls(app.minInstalls)}</div></div>
    <div class="dstat"><div class="dstat-label">Rating</div><div class="dstat-value yellow">${fmtRating(app.score)}</div></div>
    <div class="dstat"><div class="dstat-label">Reviews</div><div class="dstat-value">${fmtNum(app.reviews)}</div></div>
    <div class="dstat"><div class="dstat-label">Price</div><div class="dstat-value">${app.priceText||(app.free?'Free':'—')}</div></div>
  </div>
  <div class="detail-body">
    ${app.summary?`<div class="detail-section-title">Summary</div><div class="detail-summary">${app.summary}</div>`:''}
    ${screenshots}
    ${app.recentChanges?`<div class="detail-section-title">Recent changes</div><div class="detail-summary">${app.recentChanges}</div>`:''}
    <div class="detail-section-title">Details</div>
    <div class="detail-meta-grid">
      <div class="meta-item"><div class="meta-key">Released</div><div class="meta-val">${fmtDate(app.released)}</div></div>
      <div class="meta-item"><div class="meta-key">Last updated</div><div class="meta-val">${fmtDate(app.updated)}</div></div>
      <div class="meta-item"><div class="meta-key">Version</div><div class="meta-val">${app.version||'—'}</div></div>
      <div class="meta-item"><div class="meta-key">Android version</div><div class="meta-val">${app.androidVersion||'—'}</div></div>
      <div class="meta-item"><div class="meta-key">Content rating</div><div class="meta-val">${app.contentRating||'—'}</div></div>
      <div class="meta-item"><div class="meta-key">Genre</div><div class="meta-val">${app.genre||'—'}</div></div>
      <div class="meta-item"><div class="meta-key">Install range</div><div class="meta-val">${app.installs||fmtInstalls(app.minInstalls)}</div></div>
      <div class="meta-item"><div class="meta-key">Ratings count</div><div class="meta-val">${fmtNum(app.ratings)}</div></div>
    </div>
    <div class="detail-actions">
      <button class="btn-outline" onclick="loadSimilar('${app.appId}')">Similar apps</button>
      <button class="btn-outline" onclick="loadReviews('${app.appId}')">Reviews</button>
      ${app.developerId?`<button class="btn-outline" onclick="loadDev('${app.developerId}')">More by dev</button>`:''}
      <a class="btn-accent" href="${app.url}" target="_blank" rel="noopener">View on Play Store ↗</a>
    </div>
    <div id="detail-extra"></div>
  </div>
</div>`;
}

/* ── Loading states ─────────────────────────────────── */
function renderLoading(el, msg='Fetching from Play Store…') {
  el.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>${msg}</span></div>`;
}
function renderLoadingDate(el) {
  el.innerHTML = `
    <div class="loading-state"><div class="spinner"></div><span>Fetching apps &amp; release dates…</span></div>
    <div class="loading-note">
      <strong>Why is this slow?</strong><br>
      Google Play doesn't include release dates in search results. We must fetch each app's full detail page individually to get the release date. This takes <strong>15–40 seconds</strong> for 50 results.<br><br>
      💡 Tip: Use a <strong>smaller Results limit (10–20)</strong> for faster responses.
    </div>`;
}
function renderError(el, msg) {
  el.innerHTML = `<div class="error-state">⚠ ${msg}</div>`;
}
function renderGrid(el, apps, showRank, meta) {
  if (!apps.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◌</div>
        <p>No results matched your filters.</p>
        <p class="empty-sub">Tips: Try a <strong>wider date range</strong> (2 years works well), lower min installs, or remove the date filter to see all results first.</p>
      </div>`;
    return;
  }
  const metaHtml = meta ? `<div class="result-meta">${meta}</div>` : `<div class="result-meta">Found <span>${apps.length}</span> apps</div>`;
  el.innerHTML = metaHtml + `<div class="app-grid">${apps.map((a,i)=>appCard(a,showRank?i:null)).join('')}</div>`;
  el.querySelectorAll('.app-card').forEach((c,i) => c.style.animationDelay=`${i*0.025}s`);
}

/* ── Search ─────────────────────────────────────────── */
async function runSearch() {
  const btn = document.getElementById('searchBtn');
  const out = document.getElementById('searchResults');
  btn.disabled = true;

  const q              = document.getElementById('searchQuery').value.trim();
  const releasedAfter  = document.getElementById('searchReleasedAfter').value;
  const releasedBefore = document.getElementById('searchReleasedBefore').value;
  const minInstalls    = document.getElementById('searchMinInstalls').value;
  const wantDate       = !!(releasedAfter || releasedBefore);

  wantDate ? renderLoadingDate(out) : renderLoading(out);

  const params = new URLSearchParams({
    q,
    category:      document.getElementById('searchCategory').value,
    sort:          document.getElementById('searchSort').value,
    num:           document.getElementById('searchNum').value,
    lang:          document.getElementById('globalLang').value,
    price:         document.getElementById('searchPrice').value,
    minInstalls,
    maxInstalls:   document.getElementById('searchMaxInstalls').value,
    minRating:     document.getElementById('searchMinRating').value,
    minReviews:    document.getElementById('searchMinReviews').value,
    releasedAfter,
    releasedBefore,
    contentRating: document.getElementById('searchContent').value,
    allCategories: document.getElementById('searchAllCategories').checked ? 'true' : '',
  });

  try {
    const data = await fetchJson(`${API}/api/search?${params}`);

    const parts = [];
    if (q)            parts.push(`keyword: <span>"${q}"</span>`);
    if (data.scope === 'all-categories') parts.push('scope: <span>all categories</span>');
    if (wantDate)     parts.push(`released: <span>${releasedAfter||'…'} → ${releasedBefore||'now'}</span>`);
    if (minInstalls)  parts.push(`min installs: <span>${fmtInstalls(parseInt(minInstalls))}</span>`);
    const note = data.enriched ? ` <span class="meta-note">(* = updated date used as proxy where released date unavailable)</span>` : '';
    const meta = `<span>${data.total}</span> app${data.total!==1?'s':''} found${parts.length?' &nbsp;·&nbsp; '+parts.join(' &nbsp;·&nbsp; '):''}${note}`;
    renderGrid(out, data.apps, false, meta);
  } catch(e) {
    renderError(out, e.message);
  }
  btn.disabled = false;
}

/* ── Trending discovery ────────────────────────────── */
const trendingState = {
  apps: [],
  previousIds: new Set(),
  autoTimer: null,
  logTimer: null,
  progressTimer: null,
  sourceCounts: { categories: 0, keywords: 0, countries: 0 },
};

function installsForSort(app) {
  return app.minInstalls || app.maxInstalls || 0;
}

function dateForSort(app) {
  const d = app.released ? new Date(app.released) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

function sortTrendingApps(apps, mode) {
  return [...apps].sort((a, b) => {
    if (mode === 'rating') return (b.score || 0) - (a.score || 0) || dateForSort(b) - dateForSort(a);
    if (mode === 'installs') return installsForSort(b) - installsForSort(a) || dateForSort(b) - dateForSort(a);
    return dateForSort(b) - dateForSort(a) || (b.score || 0) - (a.score || 0);
  });
}

function setTrendingStatus(message, active=false) {
  const status = document.getElementById('trendingStatus');
  status.classList.toggle('active', active);
  status.querySelector('span').textContent = message;
}

function setTrendingProgress(percent) {
  const bar = document.querySelector('#trendingStatus .progress-bar');
  if (!bar) return;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  bar.style.width = `${value}%`;
  bar.setAttribute('aria-valuenow', String(value));
}

function selectedTrendingScope(counts) {
  const value = document.getElementById('trendingCountry').value;
  const selected = document.getElementById('trendingCountry').selectedOptions[0]?.textContent || 'No country filter';
  const countryCount = value === 'worldwide' ? counts.countries : 1;
  return {
    countryCount,
    label: value === 'worldwide' ? `Worldwide (${counts.countries} countries)` : selected,
    scans: countryCount * (counts.categories + counts.keywords),
  };
}

function appendTrendingLog(message) {
  const log = document.getElementById('trendingLog');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  log.insertAdjacentHTML('beforeend', `<div class="log-line"><span>${time}</span>${message}</div>`);
  log.scrollTop = log.scrollHeight;
}

function clearTrendingLog() {
  document.getElementById('trendingLog').innerHTML = '';
}

function stopTrendingLogTicker() {
  if (trendingState.logTimer) {
    clearInterval(trendingState.logTimer);
    trendingState.logTimer = null;
  }
  if (trendingState.progressTimer) {
    clearInterval(trendingState.progressTimer);
    trendingState.progressTimer = null;
  }
}

function startTrendingLogTicker(counts) {
  stopTrendingLogTicker();
  clearTrendingLog();
  setTrendingProgress(0);

  const scope = selectedTrendingScope(counts);
  const perSource = document.getElementById('trendingMaxResults').value || '5';
  const days = document.getElementById('trendingDaysBack').value || '30';
  const minRating = document.getElementById('trendingMinRating').value || '0';
  const minInstalls = document.getElementById('trendingMinInstalls').value || '0';
  const phases = [
    { pct: 5, msg: `Preparing ${scope.label} discovery run.` },
    { pct: 12, msg: `Sources selected: ${counts.categories} categories + ${counts.keywords} keywords.` },
    { pct: 20, msg: `Queue size: ${scope.scans.toLocaleString()} searches, up to ${perSource} results from each source.` },
    { pct: 34, msg: 'Searching category charts for currently visible apps.' },
    { pct: 48, msg: 'Searching keyword results sorted by newest apps.' },
    { pct: 60, msg: 'Ignoring failed sources and keeping successful batches.' },
    { pct: 70, msg: 'Removing duplicate package IDs found from multiple sources.' },
    { pct: 82, msg: 'Fetching full app pages to read release dates and install ranges.' },
    { pct: 90, msg: `Applying filters: released within ${days} days, rating ${minRating}+, installs ${minInstalls}+. ` },
    { pct: 94, msg: 'Sorting by trend score and newest release date, then updating cache.' },
  ];
  let index = 0;
  let elapsed = 0;

  const nextPhase = () => {
    const phase = phases[Math.min(index, phases.length - 1)];
    setTrendingProgress(phase.pct);
    appendTrendingLog(phase.msg);
    index++;
  };

  nextPhase();
  trendingState.logTimer = setInterval(() => {
    if (index < phases.length) nextPhase();
  }, 1800);
  trendingState.progressTimer = setInterval(() => {
    elapsed += 5;
    if (index >= phases.length) {
      appendTrendingLog(`Still working... Google Play detail pages can be slow. Elapsed: ${elapsed}s.`);
    }
  }, 5000);
}

async function loadTrendingSources() {
  if (trendingState.sourceCounts.categories && trendingState.sourceCounts.keywords && trendingState.sourceCounts.countries) {
    return trendingState.sourceCounts;
  }

  const data = await fetchJson(`${API}/api/trending-categories`);
  trendingState.sourceCounts = {
    categories: Array.isArray(data.categories) ? data.categories.length : 0,
    keywords: Array.isArray(data.keywords) ? data.keywords.length : 0,
    countries: Array.isArray(data.countries) ? data.countries.length : 0,
  };
  return trendingState.sourceCounts;
}

function renderTrendingGrid() {
  const out = document.getElementById('trendingResults');
  const sortMode = document.getElementById('trendingSort').value;
  const apps = sortTrendingApps(trendingState.apps, sortMode);
  const days = document.getElementById('trendingDaysBack').value || '30';

  if (!apps.length) {
    out.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">↯</div>
        <p>No trending apps matched these filters.</p>
        <p class="empty-sub">Try a wider release window, lower min rating, or lower min installs.</p>
      </div>`;
    return;
  }

  const meta = `Found <span>${apps.length}</span> unique apps released in the last <span>${days}</span> days`;
  renderGrid(out, apps, false, meta);
}

function trendingParams() {
  return new URLSearchParams({
    daysBack: document.getElementById('trendingDaysBack').value || '30',
    minRating: document.getElementById('trendingMinRating').value || '0',
    minInstalls: document.getElementById('trendingMinInstalls').value || '0',
    maxResults: document.getElementById('trendingMaxResults').value || '5',
    country: document.getElementById('trendingCountry').value,
    lang: document.getElementById('globalLang').value || 'en',
  });
}

async function refreshTrendingCacheStatus() {
  try {
    const data = await fetchJson(`${API}/api/trending-cache-status?${trendingParams()}`);
    if (!data.cachedAt) {
      const counts = await loadTrendingSources();
      const scope = selectedTrendingScope(counts);
      setTrendingStatus(`Ready to scan ${scope.label}: ${counts.categories} categories + ${counts.keywords} keywords.`);
      setTrendingProgress(0);
      return;
    }

    const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(data.cachedAt).getTime()) / 60000));
    setTrendingStatus(`Last scanned ${minutesAgo} minute${minutesAgo===1?'':'s'} ago · ${data.totalApps} apps cached`);
    setTrendingProgress(100);
  } catch(_) {}
}

async function runTrendingDiscovery({ auto = false } = {}) {
  const btn = document.getElementById('trendingBtn');
  const out = document.getElementById('trendingResults');
  btn.disabled = true;

  try {
    const counts = await loadTrendingSources();
    const scope = selectedTrendingScope(counts);
    const scanMsg = `Scanning Play Store ${scope.label}: ${counts.categories} categories and ${counts.keywords} keywords...`;
    setTrendingStatus(scanMsg, true);
    startTrendingLogTicker(counts);
    renderLoading(out, scanMsg);

    const data = await fetchJson(`${API}/api/trending-discovery?${trendingParams()}`);
    stopTrendingLogTicker();
    setTrendingProgress(100);
    const priorIds = new Set(trendingState.apps.map(app => app.appId));
    trendingState.previousIds = priorIds;
    trendingState.apps = (data.apps || []).map(app => ({
      ...app,
      _isNew: auto && priorIds.size > 0 && !priorIds.has(app.appId),
    }));

    const days = document.getElementById('trendingDaysBack').value || '30';
    setTrendingStatus(`Found ${data.total || 0} unique apps released in the last ${days} days`);
    appendTrendingLog(`Complete: found ${(data.total || 0).toLocaleString()} matching apps from ${(data.sources?.scans || scope.scans).toLocaleString()} source searches.`);
    renderTrendingGrid();
  } catch(e) {
    stopTrendingLogTicker();
    setTrendingProgress(0);
    setTrendingStatus('Discovery failed. Adjust filters and try again.');
    appendTrendingLog(`Error: ${e.message}`);
    renderError(out, e.message);
  }

  btn.disabled = false;
}

function updateTrendingAutoRefresh() {
  if (trendingState.autoTimer) {
    clearInterval(trendingState.autoTimer);
    trendingState.autoTimer = null;
  }

  const enabled = document.getElementById('trendingAutoRefresh').checked;
  if (!enabled) return;

  const minutes = Math.max(parseInt(document.getElementById('trendingRefreshMinutes').value, 10) || 60, 5);
  trendingState.autoTimer = setInterval(() => runTrendingDiscovery({ auto: true }), minutes * 60 * 1000);
}

/* ── Quick discover ─────────────────────────────────── */
function quickDiscover(days, category) {
  const now=new Date(), past=new Date();
  past.setDate(now.getDate()-days);
  document.getElementById('searchReleasedAfter').value  = past.toISOString().split('T')[0];
  document.getElementById('searchReleasedBefore').value = now.toISOString().split('T')[0];
  document.getElementById('searchQuery').value          = '';
  document.getElementById('searchCategory').value       = category;
  document.getElementById('searchMinInstalls').value    = '1000';
  document.getElementById('searchNum').value            = '20';
  runSearch();
}

/* ── Top Charts ─────────────────────────────────────── */
async function runTop() {
  const btn=document.getElementById('topBtn'), out=document.getElementById('topResults');
  btn.disabled=true; renderLoading(out);
  const params=new URLSearchParams({ collection:document.getElementById('topCollection').value, category:document.getElementById('topCategory').value, num:document.getElementById('topNum').value, lang:document.getElementById('globalLang').value });
  try {
    const data=await fetchJson(`${API}/api/top?${params}`);
    renderGrid(out,data.apps,true);
  } catch(e) { renderError(out,e.message); }
  btn.disabled=false;
}

/* ── Lookup ─────────────────────────────────────────── */
async function runLookup(appId) {
  const id=appId||document.getElementById('lookupId').value.trim();
  if(!id) return;
  const btn=document.getElementById('lookupBtn'), out=document.getElementById('lookupResults');
  btn.disabled=true; renderLoading(out);
  try {
    const data=await fetchJson(`${API}/api/app/${encodeURIComponent(id)}?lang=${document.getElementById('globalLang').value}`);
    out.innerHTML=detailView(data);
  } catch(e) { renderError(out,e.message); }
  btn.disabled=false;
}
function quickLookup(id){ document.getElementById('lookupId').value=id; runLookup(id); }

/* ── Developer ──────────────────────────────────────── */
async function runDev(devId) {
  const id=devId||document.getElementById('devId').value.trim();
  if(!id) return;
  const btn=document.getElementById('devBtn'), out=document.getElementById('devResults');
  btn.disabled=true; renderLoading(out);
  const params=new URLSearchParams({ num:document.getElementById('devNum').value, lang:document.getElementById('globalLang').value });
  try {
    const data=await fetchJson(`${API}/api/developer/${encodeURIComponent(id)}?${params}`);
    renderGrid(out,data.apps,false);
  } catch(e) { renderError(out,e.message); }
  btn.disabled=false;
}
function quickDev(id){ document.getElementById('devId').value=id; runDev(id); }

/* ── Modal ──────────────────────────────────────────── */
async function openDetail(appId) {
  const overlay=document.getElementById('modalOverlay'), body=document.getElementById('modalBody');
  overlay.classList.add('open');
  body.innerHTML=`<div class="loading-state"><div class="spinner"></div><span>Loading…</span></div>`;
  try {
    const data=await fetchJson(`${API}/api/app/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}`);
    body.innerHTML=detailView(data);
  } catch(e) { body.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }

async function loadSimilar(appId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const data=await fetchJson(`${API}/api/similar/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}`);
    extra.innerHTML=`<div class="detail-section-title" style="margin-top:1.5rem">Similar apps</div><div class="app-grid" style="margin-top:.75rem">${data.apps.map(a=>appCard(a)).join('')}</div>`;
  } catch(e){ extra.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
async function loadReviews(appId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const data=await fetchJson(`${API}/api/reviews/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}&num=10`);
    const html=data.reviews.map(r=>`<div class="review-card"><div class="review-header"><span class="review-user">${r.userName||'Anonymous'}</span><span class="review-rating">${'★'.repeat(r.score||0)}${'☆'.repeat(5-(r.score||0))}</span></div><div class="review-text">${r.text||'—'}</div><div class="review-date">${fmtDate(r.date)}</div></div>`).join('');
    extra.innerHTML=`<div class="detail-section-title" style="margin-top:1.5rem">Reviews (${data.reviews.length})</div><div style="margin-top:.75rem">${html}</div>`;
  } catch(e){ extra.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
async function loadDev(devId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const data=await fetchJson(`${API}/api/developer/${encodeURIComponent(devId)}?lang=${document.getElementById('globalLang').value}&num=20`);
    extra.innerHTML=`<div class="detail-section-title" style="margin-top:1.5rem">More by this developer</div><div class="app-grid" style="margin-top:.75rem">${data.apps.map(a=>appCard(a)).join('')}</div>`;
  } catch(e){ extra.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}

/* ── Date presets ───────────────────────────────────── */
function setDatePreset(days) {
  const now=new Date(), past=new Date(); past.setDate(now.getDate()-days);
  document.getElementById('searchReleasedAfter').value  = past.toISOString().split('T')[0];
  document.getElementById('searchReleasedBefore').value = now.toISOString().split('T')[0];
}
function clearDates() {
  document.getElementById('searchReleasedAfter').value='';
  document.getElementById('searchReleasedBefore').value='';
}

/* ── Tabs ───────────────────────────────────────────── */
const tabTitles={search:'Search Apps',trending:'Trending Discovery',top:'Top Charts',lookup:'App Lookup',developer:'Developer Apps'};
function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(el=>el.classList.toggle('active',el.id==='tab-'+name));
  document.getElementById('topbarTitle').textContent=tabTitles[name]||'';
  document.getElementById('sidebar').classList.remove('open');
}

/* ── Categories ─────────────────────────────────────── */
async function loadCategories() {
  try {
    const cats=await fetchJson(`${API}/api/categories`);
    ['searchCategory','topCategory'].forEach(id=>{
      const sel=document.getElementById(id);
      cats.forEach(c=>{
        const opt=document.createElement('option');
        opt.value=c.id;
        opt.textContent=c.name.charAt(0)+c.name.slice(1).toLowerCase().replace(/_/g,' ');
        sel.appendChild(opt);
      });
    });
  } catch(_){}
}


/* ── Autocomplete suggest (v10 gplay.suggest) ───────── */
let suggestTimer = null;
let suggestActive = -1;

async function fetchSuggestions(q) {
  if (!q || q.length < 2) { closeSuggest(); return; }
  try {
    const data = await fetchJson(`${API}/api/suggest?q=${encodeURIComponent(q)}&lang=${document.getElementById('globalLang').value}`);
    showSuggest(Array.isArray(data) ? data : []);
  } catch(_) {}
}

function showSuggest(items) {
  const list = document.getElementById('suggestList');
  if (!items.length) { closeSuggest(); return; }
  list.innerHTML = items.map((s,i) => `<li data-i="${i}" onclick="pickSuggest('${s.replace(/'/g,'&#39;')}')">${s}</li>`).join('');
  list.classList.add('open');
  suggestActive = -1;
}

function closeSuggest() {
  document.getElementById('suggestList').classList.remove('open');
  suggestActive = -1;
}

function pickSuggest(val) {
  document.getElementById('searchQuery').value = val;
  closeSuggest();
  runSearch();
}

/* ── Init ───────────────────────────────────────────── */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') closeModal();
  if(e.key==='Enter'&&e.target.id==='searchQuery') runSearch();
  if(e.key==='Enter'&&e.target.id==='lookupId') runLookup();
  if(e.key==='Enter'&&e.target.id==='devId') runDev();
});
document.addEventListener('DOMContentLoaded',()=>{
  loadCategories();
  loadTrendingSources()
    .then(counts => {
      const scope = selectedTrendingScope(counts);
      setTrendingStatus(`Ready to scan ${scope.label}: ${counts.categories} categories + ${counts.keywords} keywords.`);
    })
    .then(refreshTrendingCacheStatus)
    .catch(() => {});
  document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>switchTab(el.dataset.tab)));
  document.getElementById('searchBtn').addEventListener('click',runSearch);
  document.getElementById('searchQuery').addEventListener('input', e => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => fetchSuggestions(e.target.value.trim()), 280);
  });
  document.getElementById('searchQuery').addEventListener('keydown', e => {
    const list = document.getElementById('suggestList');
    const items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { suggestActive = Math.min(suggestActive+1, items.length-1); items.forEach((el,i)=>el.classList.toggle('active',i===suggestActive)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { suggestActive = Math.max(suggestActive-1, 0); items.forEach((el,i)=>el.classList.toggle('active',i===suggestActive)); e.preventDefault(); }
    else if (e.key === 'Enter' && suggestActive >= 0) { pickSuggest(items[suggestActive].textContent); e.stopPropagation(); }
    else if (e.key === 'Escape') { closeSuggest(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrap')) closeSuggest(); });
  document.getElementById('topBtn').addEventListener('click',runTop);
  document.getElementById('trendingBtn').addEventListener('click',()=>runTrendingDiscovery());
  document.getElementById('trendingSort').addEventListener('change',renderTrendingGrid);
  document.getElementById('trendingAutoRefresh').addEventListener('change',updateTrendingAutoRefresh);
  document.getElementById('trendingRefreshMinutes').addEventListener('change',updateTrendingAutoRefresh);
  ['trendingDaysBack','trendingMinRating','trendingMinInstalls','trendingMaxResults','trendingCountry','globalLang'].forEach(id => {
    document.getElementById(id).addEventListener('change', refreshTrendingCacheStatus);
  });
  document.getElementById('lookupBtn').addEventListener('click',()=>runLookup());
  document.getElementById('devBtn').addEventListener('click',()=>runDev());
  document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
});
