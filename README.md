# Play Store Explorer v2

Full-stack Google Play Store explorer using **google-play-scraper v10.1.2** (ESM).

## ⚠️ Breaking change from v9 → v10

Version 10 is **pure ESM** — `require()` no longer works.  
This project is fully updated: `"type": "module"` in package.json, all files use `import`.

## Setup

```bash
npm install
npm start
# Open http://localhost:3000
```

**Node.js 18+ required** (ESM + `--watch` support).

## Recommended deployment

The Trending Discovery scan can run longer than Vercel's serverless timeout.
Use Vercel for the static frontend, and deploy the Express API to a normal Node
host such as Render or Railway.

### 1. Deploy backend API to Render

This repo includes `render.yaml`.

Render settings:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/categories`

After deploy, Render will give you a URL like:

```text
https://play-explorer-api.onrender.com
```

### 2. Point frontend to backend

Edit `public/config.js`:

```js
window.PLAY_EXPLORER_API_BASE = 'https://play-explorer-api.onrender.com';
```

Keep it empty for local same-origin development:

```js
window.PLAY_EXPLORER_API_BASE = '';
```

### 3. Deploy frontend to Vercel

Vercel now serves only the static frontend from `public/`.

```bash
vercel --prod
```

Do not route `/api/*` through Vercel for the Trending Discovery backend.

## Project structure

```
play-explorer/
├── server/
│   └── index.js          # Express API — ESM, uses import gplay from 'google-play-scraper'
├── public/
│   ├── index.html
│   ├── config.js         # Frontend API base URL for separate backend deployment
│   ├── css/style.css
│   └── js/app.js
├── package.json          # "type": "module" ← required for v10
├── render.yaml           # Render backend deployment blueprint
└── README.md
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Search or browse apps |
| GET | `/api/app/:appId` | Full app detail (includes `released` date) |
| GET | `/api/top` | Top charts |
| GET | `/api/similar/:appId` | Similar apps |
| GET | `/api/developer/:devId` | Developer's apps |
| GET | `/api/reviews/:appId` | App reviews |
| GET | `/api/suggest?q=` | Autocomplete suggestions (v10 feature) |
| GET | `/api/categories` | All category IDs |

## Search query params

| Param | Description |
|-------|-------------|
| `q` | Keyword (optional — leave blank to browse by filters) |
| `category` | e.g. `TOOLS`, `GAME`, `PHOTOGRAPHY` |
| `sort` | `1`=Relevance, `2`=Rating, `3`=Newest |
| `num` | Result count (max 100) |
| `lang` | Language code (default `en`) |
| `country` | Country code (default `us`) |
| `minInstalls` | e.g. `1000` |
| `maxInstalls` | e.g. `100000` |
| `minRating` | e.g. `4.0` |
| `minReviews` | e.g. `500` |
| `price` | `free` or `paid` |
| `contentRating` | `Everyone`, `Teen`, `Mature 17+` |
| `releasedAfter` | `YYYY-MM-DD` — requires full detail fetch (slower) |
| `releasedBefore` | `YYYY-MM-DD` |

## v10 API notes

- **ESM only**: `import gplay from 'google-play-scraper'`
- `reviews()` returns `{ data: [...], nextPaginationToken }` — access `.data`
- `suggest()` is available for autocomplete
- `datasafety()` and `permissions()` are available (not exposed in UI but in server)
- `sort` constants: `gplay.sort.NEWEST=2`, `gplay.sort.RATING=3`, `gplay.sort.HELPFULNESS=1`
- `collection` constants: `gplay.collection.TOP_FREE`, `TOP_PAID`, `GROSSING`
- `released` date is only available via `gplay.app()` (full detail), not from `list()`/`search()`
- Date-filtered search gathers candidate app IDs first, then fetches full details with limited concurrency.

## Why is date filtering slow?

Google Play's list/search APIs don't return the `released` date.  
Only `gplay.app()` (full detail page fetch) includes it.  
When a date filter is active, the server fetches full details for candidate results in batches of 4 — this takes longer than normal search.  
**Tip:** Set Results limit to 10–20 for faster date-filtered searches.
