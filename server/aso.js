import gplay from 'google-play-scraper';

const asoCache = new Map();
const ASO_CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

export const COUNTRY_NAMES = {
  us: { name: 'United States', flag: '🇺🇸' },
  gb: { name: 'United Kingdom', flag: '🇬🇧' },
  in: { name: 'India', flag: '🇮🇳' },
  pk: { name: 'Pakistan', flag: '🇵🇰' },
  ca: { name: 'Canada', flag: '🇨🇦' },
  au: { name: 'Australia', flag: '🇦🇺' },
  de: { name: 'Germany', flag: '🇩🇪' },
  fr: { name: 'France', flag: '🇫🇷' },
  br: { name: 'Brazil', flag: '🇧🇷' },
  jp: { name: 'Japan', flag: '🇯🇵' },
  kr: { name: 'South Korea', flag: '🇰🇷' },
  sa: { name: 'Saudi Arabia', flag: '🇸🇦' },
  ae: { name: 'United Arab Emirates', flag: '🇦🇪' },
  tr: { name: 'Turkey', flag: '🇹🇷' },
  es: { name: 'Spain', flag: '🇪🇸' },
  it: { name: 'Italy', flag: '🇮🇹' },
  id: { name: 'Indonesia', flag: '🇮🇩' },
  mx: { name: 'Mexico', flag: '🇲🇽' },
};

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  // Common noise words
  'app', 'apps', 'application', 'android', 'google', 'play', 'download', 'free', 'best', 'new', 'latest',
  'update', 'version', 'phone', 'mobile', 'device', 'devices', 'features', 'support', 'supports', 'easy',
  'simple', 'fast', 'pro', 'click', 'tab', 'screen', 'use', 'user', 'users', 'online', 'offline'
]);

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
      } catch (err) {
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Cleans and tokenizes text into lowercase words
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Classifies how well an app title matches a search keyword
 * Returns 'exact' | 'broad' | 'partial' | 'none'
 */
export function classifyTitleMatch(title, keyword) {
  if (!title || !keyword) return 'none';
  const cleanTitle = title.toLowerCase();
  const cleanKw = keyword.toLowerCase().trim();

  // Exact full phrase match
  if (cleanTitle.includes(cleanKw)) return 'exact';

  const kwWords = tokenize(cleanKw);
  if (!kwWords.length) return 'none';

  const titleWords = new Set(tokenize(cleanTitle));
  const matchedCount = kwWords.filter(w => titleWords.has(w)).length;

  if (matchedCount === kwWords.length) return 'broad';
  if (matchedCount >= Math.ceil(kwWords.length / 2)) return 'partial';
  return 'none';
}

/**
 * Scrapes Google Play HTML fallback when gplay.search encounters layout changes
 */
async function fallbackSearchIds(term, { lang = 'en', country = 'us', num = 15 } = {}) {
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
  } catch {
    return [];
  }
}

/**
 * Retrieves candidates with automated HTML fallback
 */
async function getSearchCandidates(term, { lang = 'en', country = 'us', num = 15 } = {}) {
  const scraperResults = await gplay.search({ term, lang, country, num }).catch(() => []);
  if (scraperResults && scraperResults.length) {
    return scraperResults.map(item => ({
      appId: item.appId,
      title: item.title,
      icon: item.icon,
      developer: item.developer,
      score: item.score,
      free: item.free,
      priceText: item.priceText,
      url: item.url,
    }));
  }

  // Fallback to direct Play Store HTML scraper
  const ids = await fallbackSearchIds(term, { lang, country, num });
  return ids.map(appId => ({
    appId,
    url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}`,
  }));
}

/**
 * Determines volume tier and search range estimate
 */
function computeVolumeMetadata(score) {
  if (score >= 82) {
    return {
      tier: 'Very High',
      searchesPerMonth: '250K – 1M+',
      color: 'green',
      dailySearchesAvg: 22000,
    };
  }
  if (score >= 65) {
    return {
      tier: 'High',
      searchesPerMonth: '75K – 250K',
      color: 'green',
      dailySearchesAvg: 6000,
    };
  }
  if (score >= 45) {
    return {
      tier: 'Moderate',
      searchesPerMonth: '20K – 75K',
      color: 'yellow',
      dailySearchesAvg: 1800,
    };
  }
  if (score >= 28) {
    return {
      tier: 'Low',
      searchesPerMonth: '5K – 20K',
      color: 'orange',
      dailySearchesAvg: 500,
    };
  }
  return {
    tier: 'Very Low',
    searchesPerMonth: '< 5K',
    color: 'gray',
    dailySearchesAvg: 120,
  };
}

/**
 * Classifies ASO Opportunity Strategy
 */
function classifyOpportunity(volumeScore, difficultyScore) {
  const oppScore = Math.round(
    Math.max(5, Math.min(99, volumeScore * 1.25 - difficultyScore * 0.75 + 30))
  );

  let label = 'Moderate';
  let badgeClass = 'badge-yellow';
  let advice = 'Balanced target with standard competition.';

  if (volumeScore >= 50 && difficultyScore <= 45) {
    label = 'Sweet Spot';
    badgeClass = 'badge-green';
    advice = 'High search volume with low competition hurdle. Excellent primary keyword!';
  } else if (volumeScore >= 40 && difficultyScore <= 60) {
    label = 'High Potential';
    badgeClass = 'badge-blue';
    advice = 'Strong demand with reachable competitor rankings. Great target for optimized apps.';
  } else if (volumeScore >= 65 && difficultyScore >= 70) {
    label = 'High Competition';
    badgeClass = 'badge-orange';
    advice = 'Massive search traffic, but dominated by entrenched market leaders and high download apps.';
  } else if (volumeScore < 45 && difficultyScore <= 35) {
    label = 'Low-Hanging Fruit';
    badgeClass = 'badge-green';
    advice = 'Easy to rank in Top 5 quickly. Ideal for early traction or long-tail metadata.';
  } else if (volumeScore < 30 && difficultyScore <= 50) {
    label = 'Niche / Long-Tail';
    badgeClass = 'badge-gray';
    advice = 'Targeted long-tail keyword. Useful as supporting metadata in app description.';
  } else if (difficultyScore >= 60 && volumeScore < 35) {
    label = 'Low Opportunity';
    badgeClass = 'badge-red';
    advice = 'High competitive resistance with insufficient search interest. Not recommended.';
  }

  return {
    score: oppScore,
    label,
    badgeClass,
    advice,
  };
}

/**
 * Estimate daily installs by position tier based on daily search volume
 */
function computeDownloadEstimates(dailySearchesAvg) {
  return {
    rank1: {
      range: `${Math.round(dailySearchesAvg * 0.18).toLocaleString()} – ${Math.round(dailySearchesAvg * 0.28).toLocaleString()}`,
      share: '20–28%',
    },
    rank2_3: {
      range: `${Math.round(dailySearchesAvg * 0.08).toLocaleString()} – ${Math.round(dailySearchesAvg * 0.14).toLocaleString()}`,
      share: '10–14%',
    },
    rank4_5: {
      range: `${Math.round(dailySearchesAvg * 0.04).toLocaleString()} – ${Math.round(dailySearchesAvg * 0.07).toLocaleString()}`,
      share: '5–7%',
    },
    rank6_10: {
      range: `${Math.round(dailySearchesAvg * 0.015).toLocaleString()} – ${Math.round(dailySearchesAvg * 0.035).toLocaleString()}`,
      share: '2–4%',
    },
  };
}

/**
 * Analyzes a keyword for a specific country and language
 */
export async function analyzeKeyword(term, { country = 'us', lang = 'en' } = {}) {
  const cleanKeyword = String(term || '').trim();
  if (!cleanKeyword) {
    throw new Error('Keyword is required');
  }

  const cacheKey = `kw:${cleanKeyword.toLowerCase()}:${country}:${lang}`;
  const cached = asoCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ASO_CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Autocomplete suggestions & prefix testing
  const prefix3 = cleanKeyword.slice(0, 3);
  const prefix5 = cleanKeyword.slice(0, 5);

  const [exactSuggestions, prefix3Suggestions, prefix5Suggestions, searchCandidates] = await Promise.all([
    gplay.suggest({ term: cleanKeyword, lang, country }).catch(() => []),
    prefix3.length >= 2 ? gplay.suggest({ term: prefix3, lang, country }).catch(() => []) : [],
    prefix5.length >= 4 ? gplay.suggest({ term: prefix5, lang, country }).catch(() => []) : [],
    getSearchCandidates(cleanKeyword, { lang, country, num: 15 }),
  ]);

  if (!searchCandidates || !searchCandidates.length) {
    const emptyResult = {
      keyword: cleanKeyword,
      country,
      lang,
      countryInfo: COUNTRY_NAMES[country] || { name: country.toUpperCase(), flag: '🌐' },
      volume: { score: 10, ...computeVolumeMetadata(10) },
      difficulty: { score: 10, label: 'Very Easy', color: 'green', titleDensity: 0, installsBarrier: 0, ratingBarrier: 0 },
      opportunity: classifyOpportunity(10, 10),
      downloadEstimates: computeDownloadEstimates(50),
      rankedApps: [],
      suggestions: [],
      stats: { totalRanked: 0, avgInstalls: 0, avgRating: 0, exactMatches: 0, broadMatches: 0, partialMatches: 0, noneMatches: 0 },
    };
    return emptyResult;
  }

  // 2. Fetch full detail for top 10 apps to guarantee rich stats (installs, rating, developer, dates)
  const top10 = searchCandidates.slice(0, 10);
  const detailedApps = await mapLimit(top10, 4, async (candidate) => {
    try {
      const full = await gplay.app({ appId: candidate.appId, lang, country });
      return {
        appId: candidate.appId,
        title: full.title || candidate.title || 'Unknown',
        developer: full.developer || candidate.developer || '—',
        icon: full.icon || candidate.icon || null,
        score: full.score != null ? parseFloat(Number(full.score).toFixed(2)) : (candidate.score || null),
        minInstalls: full.minInstalls || 0,
        maxInstalls: full.maxInstalls || 0,
        installs: full.installs || null,
        free: full.free != null ? full.free : true,
        priceText: full.priceText || (full.free ? 'Free' : null),
        updated: full.updated || null,
        released: full.released || null,
        genre: full.genre || null,
        url: candidate.url || `https://play.google.com/store/apps/details?id=${encodeURIComponent(candidate.appId)}`,
      };
    } catch {
      return {
        appId: candidate.appId,
        title: candidate.title || 'Unknown',
        developer: candidate.developer || '—',
        icon: candidate.icon || null,
        score: candidate.score || null,
        minInstalls: 0,
        maxInstalls: 0,
        installs: null,
        free: true,
        priceText: 'Free',
        updated: null,
        released: null,
        genre: null,
        url: candidate.url || `https://play.google.com/store/apps/details?id=${encodeURIComponent(candidate.appId)}`,
      };
    }
  });

  const validApps = detailedApps.filter(Boolean);

  // 3. Compute Title Match breakdown
  let exactMatchCount = 0;
  let broadMatchCount = 0;
  let partialMatchCount = 0;
  let noneMatchCount = 0;

  const rankedApps = validApps.map((app, index) => {
    const matchType = classifyTitleMatch(app.title, cleanKeyword);
    if (matchType === 'exact') exactMatchCount++;
    else if (matchType === 'broad') broadMatchCount++;
    else if (matchType === 'partial') partialMatchCount++;
    else noneMatchCount++;

    return {
      rank: index + 1,
      appId: app.appId,
      title: app.title || 'Unknown',
      developer: app.developer || '—',
      icon: app.icon || null,
      score: app.score != null ? Number(app.score).toFixed(1) : '—',
      installs: app.minInstalls || app.maxInstalls || 0,
      installsText: app.installs || (app.minInstalls ? `${app.minInstalls.toLocaleString()}+` : '—'),
      free: app.free,
      priceText: app.priceText || (app.free ? 'Free' : null),
      updated: app.updated ? new Date(app.updated).toISOString().slice(0, 10) : null,
      released: app.released ? new Date(app.released).toISOString().slice(0, 10) : null,
      matchType,
      url: app.url,
    };
  });

  // 4. Calculate Traffic Volume Score (0 - 100)
  let suggestBonus = 30;
  const kwLower = cleanKeyword.toLowerCase();
  if (prefix3Suggestions.some(s => s.toLowerCase() === kwLower)) {
    suggestBonus = 95; // Suggested with just 3 chars = massive traffic
  } else if (prefix5Suggestions.some(s => s.toLowerCase() === kwLower)) {
    suggestBonus = 82; // Suggested with 5 chars = high traffic
  } else if (exactSuggestions.length > 0) {
    suggestBonus = 68; // Has exact suggestions
  }

  // Calculate installs volume of top ranking apps
  const avgInstalls = rankedApps.length
    ? rankedApps.reduce((acc, a) => acc + (a.installs || 0), 0) / rankedApps.length
    : 0;

  let installVolumeScore = 20;
  if (avgInstalls >= 50_000_000) installVolumeScore = 98;
  else if (avgInstalls >= 10_000_000) installVolumeScore = 88;
  else if (avgInstalls >= 1_000_000) installVolumeScore = 75;
  else if (avgInstalls >= 500_000) installVolumeScore = 65;
  else if (avgInstalls >= 100_000) installVolumeScore = 52;
  else if (avgInstalls >= 10_000) installVolumeScore = 38;

  // Single or double head keywords usually have higher volume
  const wordCount = cleanKeyword.split(/\s+/).length;
  const structureScore = wordCount === 1 ? 85 : wordCount === 2 ? 75 : wordCount === 3 ? 55 : 40;

  const rawTrafficScore = Math.round(
    suggestBonus * 0.45 + installVolumeScore * 0.40 + structureScore * 0.15
  );
  const volumeScore = Math.max(8, Math.min(99, rawTrafficScore));
  const volumeMeta = computeVolumeMetadata(volumeScore);

  // 5. Calculate Difficulty Score (0 - 100)
  const titleDensityScore = Math.round(
    ((exactMatchCount * 10 + broadMatchCount * 7 + partialMatchCount * 4) /
      Math.max(rankedApps.length * 10, 1)) *
      100
  );

  let installsBarrierScore = 25;
  if (avgInstalls >= 50_000_000) installsBarrierScore = 95;
  else if (avgInstalls >= 10_000_000) installsBarrierScore = 85;
  else if (avgInstalls >= 1_000_000) installsBarrierScore = 72;
  else if (avgInstalls >= 100_000) installsBarrierScore = 55;
  else if (avgInstalls >= 10_000) installsBarrierScore = 35;

  const scoredApps = rankedApps.filter(a => parseFloat(a.score) > 0);
  const avgRating = scoredApps.length
    ? scoredApps.reduce((acc, a) => acc + parseFloat(a.score), 0) / scoredApps.length
    : 4.0;
  const ratingBarrierScore = Math.round(Math.max(20, Math.min(100, (avgRating - 3.0) * 50)));

  const now = Date.now();
  const daysSinceUpdateList = validApps
    .map(a => (a.updated ? (now - new Date(a.updated).getTime()) / (1000 * 60 * 60 * 24) : 90))
    .filter(d => !isNaN(d));
  const avgDaysSinceUpdate = daysSinceUpdateList.length
    ? daysSinceUpdateList.reduce((acc, d) => acc + d, 0) / daysSinceUpdateList.length
    : 60;

  const updateBarrierScore = avgDaysSinceUpdate < 30 ? 85 : avgDaysSinceUpdate < 90 ? 65 : 40;

  const rawDifficulty = Math.round(
    titleDensityScore * 0.45 +
      installsBarrierScore * 0.35 +
      ratingBarrierScore * 0.10 +
      updateBarrierScore * 0.10
  );
  const difficultyScore = Math.max(10, Math.min(99, rawDifficulty));

  let difficultyLabel = 'Easy';
  let difficultyColor = 'green';
  if (difficultyScore >= 75) {
    difficultyLabel = 'Very Hard';
    difficultyColor = 'red';
  } else if (difficultyScore >= 55) {
    difficultyLabel = 'Competitive';
    difficultyColor = 'orange';
  } else if (difficultyScore >= 35) {
    difficultyLabel = 'Moderate';
    difficultyColor = 'yellow';
  }

  // 6. Opportunity & Strategy
  const opportunity = classifyOpportunity(volumeScore, difficultyScore);

  // 7. Estimated Downloads by Rank Tier
  const downloadEstimates = computeDownloadEstimates(volumeMeta.dailySearchesAvg);

  // 8. Long-Tail Keyword Suggestions
  const suggestionList = [...new Set([
    ...exactSuggestions,
    ...prefix5Suggestions,
    `best ${cleanKeyword}`,
    `free ${cleanKeyword}`,
    `${cleanKeyword} app`,
    `${cleanKeyword} 2026`,
  ])]
    .filter(s => s && s.toLowerCase() !== kwLower && s.length < 35)
    .slice(0, 10)
    .map(kw => {
      const matchInPrefix = prefix3Suggestions.includes(kw) || prefix5Suggestions.includes(kw);
      const approxScore = Math.round(
        Math.max(15, Math.min(95, volumeScore * (matchInPrefix ? 0.9 : 0.75)))
      );
      return {
        term: kw,
        trafficScore: approxScore,
        trafficTier: computeVolumeMetadata(approxScore).tier,
      };
    });

  const result = {
    keyword: cleanKeyword,
    country,
    lang,
    countryInfo: COUNTRY_NAMES[country] || { name: country.toUpperCase(), flag: '🌐' },
    volume: {
      score: volumeScore,
      ...volumeMeta,
    },
    difficulty: {
      score: difficultyScore,
      label: difficultyLabel,
      color: difficultyColor,
      titleDensity: titleDensityScore,
      installsBarrier: installsBarrierScore,
      ratingBarrier: ratingBarrierScore,
    },
    opportunity,
    downloadEstimates,
    stats: {
      totalRanked: rankedApps.length,
      avgInstalls: Math.round(avgInstalls),
      avgRating: parseFloat(avgRating.toFixed(2)),
      exactMatches: exactMatchCount,
      broadMatches: broadMatchCount,
      partialMatches: partialMatchCount,
      noneMatches: noneMatchCount,
    },
    rankedApps,
    suggestions: suggestionList,
  };

  asoCache.set(cacheKey, {
    cachedAt: Date.now(),
    data: result,
  });

  return result;
}

/**
 * Compares a keyword across top global storefronts
 */
export async function compareKeywordAcrossCountries(term, countryCodes = ['us', 'gb', 'in', 'pk', 'de', 'fr', 'br', 'jp']) {
  const cleanKeyword = String(term || '').trim();
  if (!cleanKeyword) throw new Error('Keyword is required');

  const tasks = countryCodes.map(code => ({
    code,
    info: COUNTRY_NAMES[code] || { name: code.toUpperCase(), flag: '🌐' },
  }));

  const results = await mapLimit(tasks, 4, async ({ code, info }) => {
    try {
      const candidates = await getSearchCandidates(cleanKeyword, { country: code, lang: 'en', num: 3 });
      const topAppId = candidates && candidates[0]?.appId ? candidates[0].appId : null;
      let topApp = null;

      if (topAppId) {
        try {
          const detail = await gplay.app({ appId: topAppId, country: code, lang: 'en' });
          topApp = {
            appId: detail.appId,
            title: detail.title,
            developer: detail.developer,
            icon: detail.icon,
            score: detail.score != null ? Number(detail.score).toFixed(1) : '—',
            installsText: detail.installs || (detail.minInstalls ? `${detail.minInstalls.toLocaleString()}+` : '—'),
            titleMatch: classifyTitleMatch(detail.title, cleanKeyword),
          };
        } catch {
          topApp = {
            appId: topAppId,
            title: candidates[0].title || 'App',
            developer: candidates[0].developer || '—',
            icon: candidates[0].icon || null,
            score: candidates[0].score || '—',
            installsText: '—',
            titleMatch: classifyTitleMatch(candidates[0].title, cleanKeyword),
          };
        }
      }

      return {
        country: code,
        countryName: info.name,
        flag: info.flag,
        topApp,
      };
    } catch {
      return {
        country: code,
        countryName: info.name,
        flag: info.flag,
        topApp: null,
      };
    }
  });

  return results.filter(Boolean);
}

/**
 * Extracts target keywords and n-grams from app title, summary, and description
 */
export function extractMetadataKeywords(app) {
  if (!app) return [];

  const textSources = [
    { text: app.title || '', weight: 4 },
    { text: app.summary || '', weight: 2 },
    { text: app.description || '', weight: 1 },
  ];

  const wordCounts = new Map();
  const bigramCounts = new Map();
  let totalWords = 0;

  for (const { text, weight } of textSources) {
    const rawTokens = tokenize(text);
    const validTokens = rawTokens.filter(t => t.length >= 3 && !STOP_WORDS.has(t));
    totalWords += validTokens.length;

    for (let i = 0; i < validTokens.length; i++) {
      const w = validTokens[i];
      wordCounts.set(w, (wordCounts.get(w) || 0) + weight);

      // Bigrams (2-word phrases)
      if (i < validTokens.length - 1) {
        const next = validTokens[i + 1];
        if (!STOP_WORDS.has(next)) {
          const bigram = `${w} ${next}`;
          bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + weight);
        }
      }
    }
  }

  const results = [];

  // Top single words
  for (const [word, count] of wordCounts.entries()) {
    if (count >= 2) {
      results.push({
        term: word,
        type: 'single',
        frequency: count,
        density: totalWords > 0 ? ((count / totalWords) * 100).toFixed(1) + '%' : '0%',
      });
    }
  }

  // Top bigrams
  for (const [phrase, count] of bigramCounts.entries()) {
    if (count >= 2) {
      results.push({
        term: phrase,
        type: 'phrase',
        frequency: count,
        density: totalWords > 0 ? ((count / totalWords) * 100).toFixed(1) + '%' : '0%',
      });
    }
  }

  return results
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 25);
}
