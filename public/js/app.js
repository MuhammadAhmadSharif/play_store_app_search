const API = '';

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
  });

  try {
    const res  = await fetch(`${API}/api/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');

    const parts = [];
    if (q)            parts.push(`keyword: <span>"${q}"</span>`);
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
    const res=await fetch(`${API}/api/top?${params}`), data=await res.json();
    if(!res.ok) throw new Error(data.error||'Failed');
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
    const res=await fetch(`${API}/api/app/${encodeURIComponent(id)}?lang=${document.getElementById('globalLang').value}`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Failed');
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
    const res=await fetch(`${API}/api/developer/${encodeURIComponent(id)}?${params}`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Failed');
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
    const res=await fetch(`${API}/api/app/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Failed');
    body.innerHTML=detailView(data);
  } catch(e) { body.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }

async function loadSimilar(appId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const res=await fetch(`${API}/api/similar/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error);
    extra.innerHTML=`<div class="detail-section-title" style="margin-top:1.5rem">Similar apps</div><div class="app-grid" style="margin-top:.75rem">${data.apps.map(a=>appCard(a)).join('')}</div>`;
  } catch(e){ extra.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
async function loadReviews(appId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const res=await fetch(`${API}/api/reviews/${encodeURIComponent(appId)}?lang=${document.getElementById('globalLang').value}&num=10`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error);
    const html=data.reviews.map(r=>`<div class="review-card"><div class="review-header"><span class="review-user">${r.userName||'Anonymous'}</span><span class="review-rating">${'★'.repeat(r.score||0)}${'☆'.repeat(5-(r.score||0))}</span></div><div class="review-text">${r.text||'—'}</div><div class="review-date">${fmtDate(r.date)}</div></div>`).join('');
    extra.innerHTML=`<div class="detail-section-title" style="margin-top:1.5rem">Reviews (${data.reviews.length})</div><div style="margin-top:.75rem">${html}</div>`;
  } catch(e){ extra.innerHTML=`<div class="error-state">⚠ ${e.message}</div>`; }
}
async function loadDev(devId) {
  const extra=document.getElementById('detail-extra');
  extra.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try {
    const res=await fetch(`${API}/api/developer/${encodeURIComponent(devId)}?lang=${document.getElementById('globalLang').value}&num=20`);
    const data=await res.json();
    if(!res.ok) throw new Error(data.error);
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
const tabTitles={search:'Search Apps',top:'Top Charts',lookup:'App Lookup',developer:'Developer Apps'};
function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(el=>el.classList.toggle('active',el.id==='tab-'+name));
  document.getElementById('topbarTitle').textContent=tabTitles[name]||'';
  document.getElementById('sidebar').classList.remove('open');
}

/* ── Categories ─────────────────────────────────────── */
async function loadCategories() {
  try {
    const res=await fetch(`${API}/api/categories`), cats=await res.json();
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
    const res  = await fetch(`${API}/api/suggest?q=${encodeURIComponent(q)}&lang=${document.getElementById('globalLang').value}`);
    const data = await res.json();
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
  document.getElementById('lookupBtn').addEventListener('click',()=>runLookup());
  document.getElementById('devBtn').addEventListener('click',()=>runDev());
  document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
});
