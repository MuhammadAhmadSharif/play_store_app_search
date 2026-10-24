// Set this to your deployed backend URL when the frontend is hosted separately.
// Auto-detects local development vs remote production.
const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.PLAY_EXPLORER_API_BASE = isLocal ? '' : 'https://play-store-app-search.onrender.com';
