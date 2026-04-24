import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import gplay from 'google-play-scraper';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── helpers ────────────────────────────────────────────────────────────────

function pickUseful(raw) {
  if (!raw) return null;

  // screenshots may be string[] or {url,width,height}[] depending on fullDetail
  let screenshots = [];
  if (Array.isArray(raw.screenshots)) {
    screenshots = raw.screenshots
      .map(s => (typeof s === 'string' ? s : s && s.url ? s.url : null))
      .filter(Boolean)
      .slice(0, 5);
  }

  return {
    title:         raw.title        || null,
    appId:         raw.appId        || null,
    developer:     raw.developer    || null,
    developerId:   raw.developerId  || null,
    icon:          raw.icon         || null,
    score:         raw.score != null ? parseFloat(Number(raw.score).toFixed(2)) : null,
    ratings:       raw.ratings      || null,
    reviews:       raw.reviews      || null,
    minInstalls:   raw.minInstalls  || null,
    maxInstalls:   raw.maxInstalls  || null,
    installs:      raw.installs     || null,
    free:          raw.free != null ? raw.free : null,
    price:         raw.price        || null,
    priceText:     raw.priceText    || null,
    offersIAP:     raw.offersIAP    || false,
    adSupported:   raw.adSupported  || false,
    contentRating: raw.contentRating || null,
    genre:         raw.genre        || null,
    genreId:       raw.genreId      || null,
    summary:       raw.summary      || null,
    url:           raw.url          || null,
    released:      raw.released     || null,
    updated:       raw.updated      || null,
    version:       raw.version      || null,
    androidVersion: raw.androidVersion || null,
    recentChanges: raw.recentChanges || null,
    editorsChoice: raw.editorsChoice || false,
    screenshots,
  };
}

function applyFilters(apps, filters) {
  const { category, minInstalls, maxInstalls, minRating, minReviews,
          price, contentRating, releasedAfter, releasedBefore } = filters;

  return apps.filter(app => {
    if (!matchesCategory(app, category)) return false;
    if (minInstalls) {
      const installs = app.minInstalls || app.maxInstalls || 0;
      if (installs < parseInt(minInstalls)) return false;
    }
    if (maxInstalls && parseInt(maxInstalls) > 0 && (app.minInstalls || 0) > parseInt(maxInstalls)) return false;
    if (minRating   && (app.score   || 0) < parseFloat(minRating))  return false;
    if (minReviews  && (app.reviews || 0) < parseInt(minReviews))   return false;
    if (price === 'free' && app.free === false) return false;
    if (price === 'paid' && app.free === true)  return false;
    if (contentRating && contentRating !== 'any' && app.contentRating !== contentRating) return false;

    if (releasedAfter || releasedBefore) {
      const d = app.released ? new Date(app.released) : null;
      if (!d || isNaN(d.getTime())) return false;
      if (releasedAfter  && d < new Date(releasedAfter))  return false;
      if (releasedBefore && d > new Date(releasedBefore)) return false;
    }
    return true;
  });
}

function categoryValue(category) {
  return category ? (gplay.category[category] || category) : '';
}

function matchesCategory(app, category) {
  const selected = categoryValue(category);
  if (!selected) return true;

  if (selected === gplay.category.GAME) {
    return app.genreId === gplay.category.GAME || app.genreId?.startsWith('GAME_');
  }

  return app.genreId === selected;
}

function termsForDateDiscovery(category) {
  const selected = categoryValue(category);
  if (selected === gplay.category.GAME || selected?.startsWith('GAME_')) {
    return [
      'new games',
      '2026 games',
      '2025 games',
      '2024 games',
      'action game',
      'puzzle game',
      'casual game',
      'racing game',
      'strategy game',
      'offline game',
    ];
  }

  if (selected) {
    const label = selected.toLowerCase().replace(/_/g, ' ');
    return [
      `new ${label} app`,
      `${label} app 2026`,
      `${label} app 2025`,
      `best ${label} app`,
      `free ${label} app`,
      label,
    ];
  }

  return [
    'new app',
    'new apps 2026',
    '2026 app',
    'ai app',
    'photo editor',
    'video editor',
    'fitness app',
    'finance app',
    'bank app',
    'shopping app',
    'food delivery',
    'travel app',
    'education app',
    'learning app',
    'productivity app',
    'scanner app',
    'vpn app',
    'weather app',
    'music app',
    'new game',
    '2026 games',
    'puzzle game',
    'casual game',
    'strategy game',
  ];
}

function candidateTargetForDateDiscovery(category, fetchNum) {
  const selected = categoryValue(category);
  const multiplier = selected ? 8 : 14;
  const minimum = selected ? 80 : 180;
  const maximum = selected ? 220 : 340;
  return Math.min(Math.max(fetchNum * multiplier, minimum), maximum);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function enrichWithDetails(candidates, { lang, country }) {
  return mapLimit(candidates, 4, async (candidate) => {
    try {
      return await gplay.app({
        appId: candidate.appId,
        lang,
        country,
      });
    } catch {
      return candidate;
    }
  });
}

// ─── routes ─────────────────────────────────────────────────────────────────

// Search apps — keyword is now OPTIONAL.
// Without a keyword we browse by category/collection so users can discover
// recently-released apps with 1K+ downloads without needing an app name.
app.get('/api/search', async (req, res) => {
  try {
    const {
      q = '', category, sort = '1', num = '50', lang = 'en', country = 'us',
      minInstalls, maxInstalls, minRating, minReviews,
      price, contentRating, releasedAfter, releasedBefore,
    } = req.query;

    const sortMap = {
      '1': undefined,              // relevance (default)
      '2': gplay.sort.RATING,
      '3': gplay.sort.NEWEST,
    };

    let results = [];
    const wantsDateFilter = releasedAfter || releasedBefore;
    const fetchNum = Math.min(parseInt(num) || 50, 250);
    const qTerm = q.trim();
    const needsDetailEnrichment = Boolean(wantsDateFilter || (qTerm && category));

    if (qTerm) {
      // ── keyword search ──────────────────────────────────────────────────
      results = await gplay.search({
        term: qTerm,
        num: wantsDateFilter ? Math.min(Math.max(fetchNum * 4, 80), 220) : fetchNum,
        lang,
        country,
        ...(sortMap[sort] != null ? { sort: sortMap[sort] } : {}),
        ...(category ? { category: categoryValue(category) } : {}),
        fullDetail: false,
      });
    } else if (wantsDateFilter) {
      // ── no keyword + date filter: gather candidates, then fetch full details ──
      // gplay.list() returns TOP_FREE/TOP_PAID charts which are dominated by
      // established apps released years ago — they will never pass a date filter.
      // Also, gplay.search() does not expose reliable category/date browsing.
      // Instead we search across multiple discovery terms to get a varied pool.
      //
      // Strategy: gather candidate app IDs, fetch app details to get released,
      // installs and genreId, then let applyFilters do the exact filtering.
      const broadTerms = termsForDateDiscovery(category);

      const seen = new Set();
      const targetCandidates = candidateTargetForDateDiscovery(category, fetchNum);
      const perTerm = Math.ceil(targetCandidates / broadTerms.length); // over-fetch to survive filtering

      const fetches = broadTerms.map(term =>
        gplay.search({
          term,
          num: Math.min(perTerm, 250),
          lang,
          country,
          sort: gplay.sort.NEWEST,
          ...(category ? { category: categoryValue(category) } : {}),
          fullDetail: false,
        }).catch(() => [])
      );

      const batches = await Promise.all(fetches);
      for (const batch of batches) {
        for (const item of batch) {
          if (!seen.has(item.appId)) {
            seen.add(item.appId);
            results.push(item);
          }
        }
      }
    } else {
      // ── no keyword, no date filter: browse top charts ───────────────────
      const collections = [
        gplay.collection.TOP_FREE,
        gplay.collection.TOP_PAID,
        gplay.collection.GROSSING,
      ];

      const fetches = collections.map(col =>
        gplay.list({
          collection: col,
          ...(category ? { category: categoryValue(category) } : {}),
          num: Math.min(Math.ceil(fetchNum / collections.length) + 20, 100),
          lang,
          country,
        }).catch(() => [])
      );

      const batches = await Promise.all(fetches);
      const seen = new Set();
      for (const batch of batches) {
        for (const item of batch) {
          if (!seen.has(item.appId)) {
            seen.add(item.appId);
            results.push(item);
          }
        }
      }
    }

    if (needsDetailEnrichment) {
      const seen = new Set();
      results = results.filter(item => {
        if (!item?.appId || seen.has(item.appId)) return false;
        seen.add(item.appId);
        return true;
      });
      results = await enrichWithDetails(results, { lang, country });
    }

    let apps = results.map(pickUseful).filter(Boolean);
    const scanned = apps.length;
    apps = applyFilters(apps, {
      category: needsDetailEnrichment ? category : '',
      minInstalls,
      maxInstalls,
      minRating,
      minReviews,
      price,
      contentRating,
      releasedAfter,
      releasedBefore,
    });

    // honour requested num after filtering
    const limit = Math.min(parseInt(num) || 50, 250);
    apps = apps.slice(0, limit);

    res.json({ total: apps.length, apps, enriched: needsDetailEnrichment, scanned });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// App detail by ID
app.get('/api/app/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lang = 'en', country = 'us' } = req.query;
    const result = await gplay.app({ appId, lang, country });
    res.json(pickUseful(result));
  } catch (err) {
    console.error('App detail error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch app details' });
  }
});

// Top charts
app.get('/api/top', async (req, res) => {
  try {
    const { category = '', collection = 'TOP_FREE', num = '20', lang = 'en', country = 'us' } = req.query;
    const collectionMap = {
      TOP_FREE:       gplay.collection.TOP_FREE,
      TOP_PAID:       gplay.collection.TOP_PAID,
      GROSSING:       gplay.collection.GROSSING,
      TOP_FREE_GAMES: gplay.collection.TOP_FREE,
      TOP_PAID_GAMES: gplay.collection.TOP_PAID,
    };
    const results = await gplay.list({
      collection: collectionMap[collection] || gplay.collection.TOP_FREE,
      ...(category ? { category: gplay.category[category] || category } : {}),
      num: Math.min(parseInt(num) || 20, 100),
      lang,
      country,
    });
    const apps = results.map(pickUseful).filter(Boolean);
    res.json({ total: apps.length, apps });
  } catch (err) {
    console.error('Top charts error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch top charts' });
  }
});

// Similar apps
app.get('/api/similar/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lang = 'en', country = 'us' } = req.query;
    const results = await gplay.similar({ appId, lang, country });
    res.json({ total: results.length, apps: results.map(pickUseful).filter(Boolean) });
  } catch (err) {
    console.error('Similar error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch similar apps' });
  }
});

// Developer apps
app.get('/api/developer/:devId', async (req, res) => {
  try {
    const { devId } = req.params;
    const { lang = 'en', country = 'us', num = '20' } = req.query;
    const results = await gplay.developer({ devId, lang, country, num: Math.min(parseInt(num) || 20, 100) });
    res.json({ total: results.length, apps: results.map(pickUseful).filter(Boolean) });
  } catch (err) {
    console.error('Developer error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch developer apps' });
  }
});

// Reviews
app.get('/api/reviews/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lang = 'en', country = 'us', sort = '2', num = '10' } = req.query;
    const sortMap = { '1': gplay.sort.NEWEST, '2': gplay.sort.RATING, '3': gplay.sort.HELPFULNESS };
    const result = await gplay.reviews({
      appId, lang, country,
      sort: sortMap[sort] || gplay.sort.RATING,
      num: Math.min(parseInt(num) || 10, 50),
    });
    const reviews = result && result.data ? result.data : (Array.isArray(result) ? result : []);
    res.json({ total: reviews.length, reviews });
  } catch (err) {
    console.error('Reviews error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch reviews' });
  }
});

// Available categories
app.get('/api/categories', (req, res) => {
  const cats = Object.keys(gplay.category).map(k => ({ id: k, name: k.replace(/_/g, ' ') }));
  res.json(cats);
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Play Store Explorer running at http://localhost:${PORT}`);
  });
}

export default app;
