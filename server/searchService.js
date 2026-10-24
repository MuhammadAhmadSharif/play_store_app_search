import gplay from 'google-play-scraper';
import { analyzeKeyword } from './aso.js';

const searchCache = new Map();
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 mins

/**
 * Concurrency runner
 */
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        results[idx] = await mapper(items[idx], idx);
      } catch {
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Calculates a smart relevance score for an app against a search query
 * Incorporates title matching depth, package ID resolution, developer branding, and install popularity
 * (Derived from facundoolano/aso, AsoBeast, and RespectASO ranking models)
 */
export function scoreAppRelevance(app, query) {
  if (!app || !query) return 0;
  const q = query.toLowerCase().trim();
  const title = (app.title || '').toLowerCase().trim();
  const appId = (app.appId || '').toLowerCase().trim();
  const dev = (app.developer || '').toLowerCase().trim();
  const summary = (app.summary || '').toLowerCase().trim();

  let score = 0;

  // 1. Exact package ID match
  if (appId === q) return 10000;
  if (appId.includes(q)) score += 600;

  // 2. Title matches
  if (title === q) {
    score += 5000;
  } else if (
    title.startsWith(q + ' ') ||
    title.startsWith(q + ':') ||
    title.startsWith(q + ' -') ||
    title.startsWith(q + ' –') ||
    title.startsWith(q + ' |')
  ) {
    score += 3800;
  } else if (title.includes(q)) {
    score += 2000;
  }

  // 3. Multi-word title token matching
  const qWords = q.split(/\s+/).filter(Boolean);
  if (qWords.length > 1) {
    const titleWords = new Set(title.split(/[^a-z0-9]+/).filter(Boolean));
    const matched = qWords.filter(w => titleWords.has(w)).length;
    if (matched === qWords.length) score += 2500;
    else score += matched * 500;
  }

  // 4. Developer / Brand match
  if (dev === q) score += 1600;
  else if (dev.includes(q)) score += 800;

  // 5. Summary / Description matching
  if (summary.includes(q)) score += 200;

  // 6. Popularity & legitimacy tier
  // Ensures authentic primary application ranks ahead of low-download clones with identical titles
  const installs = app.minInstalls || app.maxInstalls || 0;
  if (installs >= 100_000_000) score += 400;
  else if (installs >= 10_000_000) score += 250;
  else if (installs >= 1_000_000) score += 120;
  else if (installs >= 100_000) score += 50;

  // Rating contribution
  const rating = app.score || 0;
  score += Math.round(rating * 10);

  return score;
}

/**
 * Scrapes Google Play search HTML to extract ranked package IDs
 */
export async function scrapeSearchPackageIds(term, { country = 'us', lang = 'en', num = 25 } = {}) {
  const url = new URL('https://play.google.com/store/search');
  url.searchParams.set('q', term);
  url.searchParams.set('c', 'apps');
  url.searchParams.set('hl', lang);
  url.searchParams.set('gl', country);

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'accept-language': `${lang}-${country.toUpperCase()},${lang};q=0.9,en;q=0.8`,
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const ids = [];
    const seen = new Set();
    const appIdPattern = /\/store\/apps\/details\?id=([A-Za-z0-9._]+)/g;

    for (const match of html.matchAll(appIdPattern)) {
      const appId = decodeURIComponent(match[1]);
      if (seen.has(appId)) continue;
      seen.add(appId);
      ids.push(appId);
      if (ids.length >= num) break;
    }

    return ids;
  } catch (err) {
    console.error('Failed to scrape search HTML:', err.message);
    return [];
  }
}

/**
 * Normalizes app details from scraper
 */
function normalizeAppDetail(raw) {
  if (!raw || !raw.appId) return null;

  let screenshots = [];
  if (Array.isArray(raw.screenshots)) {
    screenshots = raw.screenshots
      .map(s => (typeof s === 'string' ? s : s && s.url ? s.url : null))
      .filter(Boolean)
      .slice(0, 5);
  }

  return {
    title: raw.title || null,
    appId: raw.appId || null,
    developer: raw.developer || null,
    developerId: raw.developerId || null,
    icon: raw.icon || null,
    score: raw.score != null ? parseFloat(Number(raw.score).toFixed(2)) : null,
    ratings: raw.ratings || null,
    reviews: raw.reviews || null,
    minInstalls: raw.minInstalls || 0,
    maxInstalls: raw.maxInstalls || 0,
    installs: raw.installs || (raw.minInstalls ? `${raw.minInstalls.toLocaleString()}+` : null),
    free: raw.free != null ? raw.free : true,
    price: raw.price || null,
    priceText: raw.priceText || (raw.free ? 'Free' : null),
    offersIAP: Boolean(raw.offersIAP),
    adSupported: Boolean(raw.adSupported),
    contentRating: raw.contentRating || null,
    genre: raw.genre || null,
    genreId: raw.genreId || null,
    summary: raw.summary || null,
    url: raw.url || `https://play.google.com/store/apps/details?id=${encodeURIComponent(raw.appId)}`,
    released: raw.released || null,
    updated: raw.updated || null,
    version: raw.version || null,
    androidVersion: raw.androidVersion || null,
    recentChanges: raw.recentChanges || null,
    editorsChoice: Boolean(raw.editorsChoice),
    screenshots,
  };
}

/**
 * Executes an optimized, accurate, country-aware app search
 */
export async function searchAppsWithRelevance(options) {
  const {
    q = '',
    country = 'us',
    lang = 'en',
    sort = '1',
    num = 30,
    category = '',
    minInstalls,
    maxInstalls,
    minRating,
    minReviews,
    price,
    contentRating,
    releasedAfter,
    releasedBefore,
  } = options;

  const qTerm = q.trim();
  const fetchLimit = Math.min(Math.max(parseInt(num, 10) || 30, 10), 100);

  // Check cache for identical search params
  const cacheKey = JSON.stringify({ qTerm, country, lang, sort, num: fetchLimit, category, minInstalls, maxInstalls, minRating, price, contentRating, releasedAfter, releasedBefore });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }

  let candidates = [];
  let directApp = null;

  // 1. Check if user typed an exact package name (e.g. com.whatsapp or org.telegram.messenger)
  const isPackageId = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(qTerm);
  if (isPackageId) {
    try {
      const exactApp = await gplay.app({ appId: qTerm, country, lang });
      if (exactApp) {
        directApp = normalizeAppDetail(exactApp);
        if (directApp) directApp._isExactPackage = true;
      }
    } catch {
      // not a direct package ID, proceed to search
    }
  }

  // 2. Fetch candidate package IDs and ASO metrics concurrently
  let asoPromise = null;
  if (qTerm) {
    asoPromise = analyzeKeyword(qTerm, { country, lang }).catch(() => null);
    const scrapedIds = await scrapeSearchPackageIds(qTerm, { country, lang, num: Math.min(fetchLimit + 8, 35) });
    candidates = scrapedIds.map(appId => ({ appId }));
  } else {
    // Keyword-less browse: fetch from top charts
    const chart = await gplay.list({
      collection: gplay.collection.TOP_FREE,
      ...(category ? { category: gplay.category[category] || category } : {}),
      country,
      lang,
      num: fetchLimit,
    }).catch(() => []);
    candidates = chart.map(c => ({ appId: c.appId }));
  }

  // If direct app was found, ensure it is at the front of candidates
  if (directApp) {
    candidates = [{ appId: directApp.appId }, ...candidates.filter(c => c.appId !== directApp.appId)];
  }

  // 3. Enrich details for candidates using controlled concurrency (5 workers)
  const enrichedApps = await mapLimit(candidates.slice(0, fetchLimit + 5), 5, async (candidate) => {
    if (directApp && candidate.appId === directApp.appId) {
      return directApp;
    }
    try {
      const full = await gplay.app({ appId: candidate.appId, country, lang });
      return normalizeAppDetail(full);
    } catch {
      return null;
    }
  });

  let apps = enrichedApps.filter(Boolean);

  // 4. Calculate Relevance Score for each app when a keyword was provided
  if (qTerm) {
    apps = apps.map(app => ({
      ...app,
      _relevance: scoreAppRelevance(app, qTerm),
    }));

    // Sort by relevance by default (sort === '1')
    if (sort === '1' || !sort) {
      apps.sort((a, b) => (b._relevance || 0) - (a._relevance || 0));
    }
  }

  // 5. Apply User Filters (only if user explicitly specified filters)
  if (category) {
    const selectedCat = gplay.category[category] || category;
    apps = apps.filter(a => a.genreId === selectedCat || (selectedCat === 'GAME' && a.genreId?.startsWith('GAME_')));
  }
  if (minInstalls) {
    const target = parseInt(minInstalls, 10);
    if (!isNaN(target) && target > 0) {
      apps = apps.filter(a => (a.minInstalls || a.maxInstalls || 0) >= target);
    }
  }
  if (maxInstalls) {
    const target = parseInt(maxInstalls, 10);
    if (!isNaN(target) && target > 0) {
      apps = apps.filter(a => (a.minInstalls || 0) <= target);
    }
  }
  if (minRating) {
    const target = parseFloat(minRating);
    if (!isNaN(target) && target > 0) {
      apps = apps.filter(a => (a.score || 0) >= target);
    }
  }
  if (minReviews) {
    const target = parseInt(minReviews, 10);
    if (!isNaN(target) && target > 0) {
      apps = apps.filter(a => (a.reviews || 0) >= target);
    }
  }
  if (price === 'free') apps = apps.filter(a => a.free === true);
  if (price === 'paid') apps = apps.filter(a => a.free === false);
  if (contentRating && contentRating !== 'any') {
    apps = apps.filter(a => a.contentRating === contentRating);
  }
  if (releasedAfter || releasedBefore) {
    apps = apps.filter(a => {
      const d = a.released ? new Date(a.released) : (a.updated ? new Date(a.updated) : null);
      if (!d || isNaN(d.getTime())) return false;
      if (releasedAfter && d < new Date(releasedAfter)) return false;
      if (releasedBefore && d > new Date(releasedBefore)) return false;
      return true;
    });
  }

  // Sort overrides if user specifically chose rating or newest
  if (sort === '2') {
    apps.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (sort === '3') {
    apps.sort((a, b) => {
      const bDate = b.released ? new Date(b.released).getTime() : (b.updated ? new Date(b.updated).getTime() : 0);
      const aDate = a.released ? new Date(a.released).getTime() : (a.updated ? new Date(a.updated).getTime() : 0);
      return bDate - aDate;
    });
  }

  // 6. Fast ASO Keyword Insight Header for searched terms
  let asoSummary = null;
  if (asoPromise) {
    const asoData = await asoPromise;
    if (asoData) {
      asoSummary = {
        term: qTerm,
        country,
        volumeScore: asoData.volume.score,
        volumeTier: asoData.volume.tier,
        monthlySearches: asoData.volume.searchesPerMonth,
        difficultyScore: asoData.difficulty.score,
        difficultyLabel: asoData.difficulty.label,
        opportunityScore: asoData.opportunity.score,
        opportunityLabel: asoData.opportunity.label,
        badgeClass: asoData.opportunity.badgeClass,
      };
    }
  }

  const finalApps = apps.slice(0, fetchLimit);
  const result = {
    total: finalApps.length,
    apps: finalApps,
    country,
    lang,
    asoSummary,
    q: qTerm,
  };

  searchCache.set(cacheKey, {
    cachedAt: Date.now(),
    data: result,
  });

  return result;
}
