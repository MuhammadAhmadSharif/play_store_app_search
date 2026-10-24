import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import gplay from 'google-play-scraper';
import { analyzeKeyword, compareKeywordAcrossCountries, extractMetadataKeywords } from './aso.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

app.disable('etag');
app.use(cors());
app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

const TRENDING_KEYWORDS = [...new Set([
  // ── AI & Machine Learning (Core) ──────────────────────────────────────
  'ai assistant', 'ai chat', 'ai image generator', 'chatgpt', 'ai video',
  'ai photo editor', 'ai avatar', 'ai art', 'ai writing', 'ai keyboard',
  'ai voice', 'ai music', 'ai translator', 'ai tutor', 'ai coding',
  'ai detector', 'ai summarizer', 'ai search', 'ai companion', 'ai girlfriend',
  'ai boyfriend', 'ai character', 'ai roleplay', 'ai story', 'ai script',
  'ai presentation', 'ai spreadsheet', 'ai email', 'ai notes', 'ai calendar',
  'ai dubbing', 'ai face swap', 'ai background', 'ai upscale', 'ai colorize',
  'ai manga', 'ai comic', 'ai anime filter', 'ai retouch', 'ai wallpaper',
  'ai chatbot', 'ai plugin', 'ai widget', 'ai sticker', 'ai object remover',
  'llm', 'gpt', 'gemini', 'claude ai', 'stable diffusion',
  'midjourney', 'text to image', 'text to video', 'text to speech', 'speech to text',
  'voice clone', 'deepfake detector', 'ai news', 'ai finance', 'ai health',
  'ai logo', 'ai poster', 'ai thumbnail', 'ai caption', 'ai hashtag',
  'ai resume', 'ai cover letter', 'ai interview', 'ai feedback', 'ai coach',

  // ── AI × Design & Visual Arts ────────────────────────────────────────
  'ai interior design', 'ai room design', 'ai home decor', 'ai floor plan', 'ai architecture',
  'ai exterior design', 'ai landscape design', 'ai garden design', 'ai office design', 'ai bedroom design',
  'ai kitchen design', 'ai bathroom design', 'ai living room design', 'ai furniture placement', 'ai color scheme',
  'ai graphic design', 'ai logo design', 'ai brand identity', 'ai business card', 'ai flyer design',
  'ai banner design', 'ai ui design', 'ai ux design', 'ai app design', 'ai web design',
  'ai illustration', 'ai character design', 'ai concept art', 'ai sketch', 'ai drawing',
  'ai painting', 'ai portrait', 'ai cartoon', 'ai caricature', 'ai pixel art',
  'ai tattoo design', 'ai nail art', 'ai henna design', 'ai mehndi', 'ai pattern design',
  'ai wallpaper design', 'ai background design', 'ai texture', 'ai mockup', 'ai prototype',
  'ai color palette', 'ai font pairing', 'ai typography', 'ai icon design', 'ai vector',

  // ── AI × Fashion & Style ─────────────────────────────────────────────
  'ai fashion design', 'ai outfit generator', 'ai style advisor', 'ai wardrobe', 'ai clothing design',
  'ai virtual try on', 'ai dress design', 'ai fabric pattern', 'ai shoe design', 'ai accessory design',
  'ai makeup look', 'ai hairstyle', 'ai hair color', 'ai beard style', 'ai skincare routine',
  'ai body measurement', 'ai size recommender', 'ai personal stylist', 'ai lookbook', 'ai trend forecast',
  'ai jewelry design', 'ai watch design', 'ai bag design', 'ai eyewear', 'ai hat design',

  // ── AI × Photography & Video ─────────────────────────────────────────
  'ai photo enhancer', 'ai image upscaler', 'ai noise reduction', 'ai sharpening', 'ai hdr',
  'ai sky replacement', 'ai background remover', 'ai object eraser', 'ai image inpainting', 'ai outpainting',
  'ai photo restoration', 'ai old photo repair', 'ai colorize photo', 'ai photo animation', 'ai photo to video',
  'ai video enhancer', 'ai video upscaler', 'ai video stabilizer', 'ai video denoiser', 'ai video colorize',
  'ai video summary', 'ai video highlight', 'ai video cutter', 'ai reel maker', 'ai shorts maker',
  'ai thumbnail generator', 'ai cover photo', 'ai profile picture', 'ai headshot', 'ai product photo',
  'ai photo background', 'ai studio photo', 'ai fashion photo', 'ai food photography ai', 'ai real estate photo',

  // ── AI × Writing & Content ────────────────────────────────────────────
  'ai content writer', 'ai blog writer', 'ai article writer', 'ai essay writer', 'ai report writer',
  'ai copywriter', 'ai ad copy', 'ai sales copy', 'ai product description', 'ai seo writer',
  'ai social media post', 'ai instagram caption', 'ai tweet generator', 'ai linkedin post', 'ai facebook post',
  'ai email writer', 'ai cold email', 'ai follow up email', 'ai newsletter', 'ai subject line',
  'ai story writer', 'ai novel writer', 'ai screenplay', 'ai script writer', 'ai dialogue writer',
  'ai poem generator', 'ai song lyrics', 'ai rap generator', 'ai joke generator', 'ai quote generator',
  'ai academic writing', 'ai thesis helper', 'ai abstract writer', 'ai citation generator', 'ai paraphraser',
  'ai grammar checker', 'ai spell check', 'ai proofreader', 'ai plagiarism checker', 'ai rewriter',
  'ai text simplifier', 'ai text expander', 'ai bullet points', 'ai meeting summary', 'ai report summary',

  // ── AI × Business & Productivity ─────────────────────────────────────
  'ai business plan', 'ai pitch deck', 'ai investor deck', 'ai financial model', 'ai market research',
  'ai competitor analysis', 'ai swot analysis', 'ai strategy', 'ai okr', 'ai kpi tracker',
  'ai project manager', 'ai task planner', 'ai sprint planner', 'ai roadmap', 'ai prioritization',
  'ai meeting notes', 'ai meeting agenda', 'ai action items', 'ai follow up', 'ai reminder ai',
  'ai crm', 'ai lead generation', 'ai sales assistant', 'ai customer service', 'ai helpdesk',
  'ai contract review', 'ai legal draft', 'ai invoice generator', 'ai proposal writer', 'ai quote maker',
  'ai data analysis', 'ai excel helper', 'ai spreadsheet formula', 'ai chart maker', 'ai dashboard',
  'ai recruitment', 'ai job description', 'ai interview questions', 'ai performance review', 'ai onboarding',

  // ── AI × Education & Learning ─────────────────────────────────────────
  'ai math solver', 'ai equation solver', 'ai homework helper', 'ai study plan', 'ai flashcard maker',
  'ai quiz generator', 'ai exam prep', 'ai mcq generator', 'ai question answer', 'ai doubt solver',
  'ai science tutor', 'ai physics solver', 'ai chemistry helper', 'ai biology tutor', 'ai history tutor',
  'ai language tutor', 'ai english tutor', 'ai grammar tutor', 'ai pronunciation', 'ai vocabulary',
  'ai coding tutor', 'ai code explainer', 'ai debug helper', 'ai algorithm', 'ai data structures',
  'ai lesson plan', 'ai curriculum', 'ai assignment maker', 'ai rubric generator', 'ai feedback teacher',
  'ai reading comprehension', 'ai speed reading', 'ai summarize book', 'ai book notes', 'ai study notes',

  // ── AI × Health & Wellness ────────────────────────────────────────────
  'ai doctor', 'ai symptom checker', 'ai diagnosis', 'ai health advice', 'ai medical report',
  'ai nutrition plan', 'ai diet plan', 'ai meal plan', 'ai calorie counter ai', 'ai recipe generator',
  'ai workout plan', 'ai fitness plan', 'ai exercise guide', 'ai yoga pose', 'ai personal trainer ai',
  'ai mental health', 'ai therapy', 'ai meditation guide', 'ai stress relief ai', 'ai sleep advice',
  'ai skin analysis', 'ai dermatology', 'ai hair analysis', 'ai eye test ai', 'ai dental check',
  'ai pregnancy guide', 'ai baby development', 'ai parenting advice ai', 'ai child health', 'ai vaccination',
  'ai drug information', 'ai medicine guide', 'ai dosage calculator', 'ai interaction checker', 'ai side effects',

  // ── AI × Finance & Investment ─────────────────────────────────────────
  'ai stock picker', 'ai trading signals', 'ai portfolio optimizer', 'ai risk assessment', 'ai financial advisor',
  'ai crypto signals', 'ai crypto analysis', 'ai market prediction', 'ai price prediction', 'ai sentiment analysis',
  'ai tax calculator', 'ai tax filing', 'ai expense categorizer', 'ai budget planner ai', 'ai savings plan',
  'ai insurance advisor', 'ai loan advisor', 'ai mortgage calculator ai', 'ai credit score ai', 'ai debt planner',
  'ai real estate valuation', 'ai property analysis', 'ai rental income', 'ai investment advice', 'ai retirement plan',

  // ── AI × Food & Cooking ───────────────────────────────────────────────
  'ai recipe generator', 'ai meal planner ai', 'ai cooking assistant', 'ai ingredient substitution', 'ai nutrition analysis',
  'ai food identifier', 'ai calorie scanner', 'ai restaurant recommender', 'ai wine pairing', 'ai cocktail maker',
  'ai grocery list ai', 'ai pantry manager', 'ai food waste reducer', 'ai diet advisor', 'ai allergy checker food',
  'ai baking assistant', 'ai chef assistant', 'ai menu planner', 'ai food blog writer', 'ai food photo enhancer',

  // ── AI × Travel & Places ──────────────────────────────────────────────
  'ai travel planner', 'ai itinerary maker', 'ai trip advisor ai', 'ai hotel recommender', 'ai flight finder',
  'ai destination guide', 'ai travel budget ai', 'ai packing list', 'ai visa guide ai', 'ai travel insurance ai',
  'ai local guide', 'ai tourist guide', 'ai landmark identifier', 'ai monument info', 'ai museum guide',
  'ai language translator travel', 'ai currency converter ai', 'ai time zone', 'ai weather travel', 'ai map ai',

  // ── AI × Real Estate & Property ──────────────────────────────────────
  'ai property valuation', 'ai house price', 'ai rent estimator', 'ai investment property', 'ai real estate ai',
  'ai virtual staging', 'ai home renovation', 'ai renovation cost', 'ai construction planner', 'ai architect ai',
  'ai interior visualizer', 'ai room visualizer', 'ai paint color ai', 'ai furniture ar', 'ai space planner',

  // ── AI × Social Media & Marketing ────────────────────────────────────
  'ai influencer', 'ai content strategy', 'ai social media manager', 'ai engagement booster', 'ai viral content',
  'ai hashtag generator', 'ai seo optimizer', 'ai keyword research ai', 'ai backlink analyzer', 'ai rank tracker ai',
  'ai ad creative', 'ai ad copy generator', 'ai a/b test', 'ai conversion optimizer', 'ai landing page',
  'ai brand voice', 'ai tone analyzer', 'ai sentiment monitor', 'ai reputation manager', 'ai review responder',
  'ai video script', 'ai youtube script', 'ai podcast script', 'ai reel script', 'ai tiktok script',

  // ── AI × Music & Audio ────────────────────────────────────────────────
  'ai music generator', 'ai beat generator', 'ai melody maker', 'ai chord progression', 'ai song composer',
  'ai lyrics generator', 'ai rap lyrics', 'ai music arranger', 'ai mastering', 'ai mixing ai',
  'ai voice generator', 'ai narrator', 'ai audiobook creator', 'ai podcast creator ai', 'ai jingle maker',
  'ai sound effects', 'ai background music', 'ai royalty free music', 'ai music video', 'ai cover song',

  // ── AI × Legal & Government ───────────────────────────────────────────
  'ai lawyer', 'ai legal advisor', 'ai contract analyzer', 'ai terms of service', 'ai privacy policy',
  'ai legal document', 'ai nda generator', 'ai will generator', 'ai lease agreement', 'ai power of attorney',
  'ai compliance checker', 'ai gdpr', 'ai copyright checker', 'ai trademark search', 'ai patent search',
  'ai government forms', 'ai tax advice', 'ai customs guide', 'ai import export', 'ai trade regulations',

  // ── AI × Coding & Development ─────────────────────────────────────────
  'ai code generator', 'ai code completion', 'ai code review', 'ai bug fixer', 'ai refactoring',
  'ai unit test generator', 'ai api builder', 'ai database designer', 'ai sql generator', 'ai regex generator',
  'ai github copilot clone', 'ai devops', 'ai ci cd', 'ai documentation', 'ai readme generator',
  'ai app builder', 'ai website builder', 'ai no code ai', 'ai low code', 'ai automation builder',

  // ── AI × Kids & Parenting ─────────────────────────────────────────────
  'ai bedtime story', 'ai kids story', 'ai fairy tale generator', 'ai children book', 'ai educational ai',
  'ai homework ai', 'ai kids tutor', 'ai drawing teacher', 'ai creativity kids', 'ai activity generator',
  'ai parenting tips ai', 'ai baby name', 'ai child development ai', 'ai school readiness', 'ai learning path',

  // ── AI × Religion & Culture ───────────────────────────────────────────
  'ai quran tafsir', 'ai islamic advice', 'ai dua generator', 'ai sermon writer', 'ai bible study ai',
  'ai prayer guide ai', 'ai spiritual advisor', 'ai horoscope ai', 'ai tarot ai', 'ai astrology ai',
  'ai culture guide', 'ai language learning ai', 'ai dialect translator', 'ai accent coach', 'ai calligraphy ai',

  // ── AI × Accessibility ───────────────────────────────────────────────
  'ai screen reader', 'ai image description', 'ai alt text generator', 'ai sign language ai', 'ai lip reading',
  'ai hearing aid ai', 'ai caption generator', 'ai subtitle generator', 'ai live transcription', 'ai braille ai',
  'ai cognitive assist', 'ai memory aid', 'ai dementia app', 'ai autism support', 'ai adhd helper',

  // ── AI × Science & Research ──────────────────────────────────────────
  'ai research assistant', 'ai literature review', 'ai paper summarizer', 'ai citation finder', 'ai experiment planner',
  'ai data visualizer', 'ai statistical analysis', 'ai hypothesis generator', 'ai lab assistant', 'ai science news ai',
  'ai climate model', 'ai weather prediction ai', 'ai earthquake prediction', 'ai astronomy ai', 'ai space explorer',

  // ── AI × Miscellaneous ───────────────────────────────────────────────
  'ai game generator', 'ai game npc', 'ai game design', 'ai game level', 'ai game dialogue',
  'ai event planner', 'ai wedding planner ai', 'ai party planner ai', 'ai gift recommender', 'ai anniversary ideas',
  'ai dream interpreter', 'ai personality test ai', 'ai compatibility test', 'ai relationship advice ai', 'ai breakup advice',
  'ai life coach', 'ai career advisor', 'ai skill assessment', 'ai learning roadmap', 'ai goal setting',
  'ai news summarizer', 'ai fact checker', 'ai bias detector', 'ai misinformation', 'ai credibility score',
  'ai shopping assistant', 'ai product recommender', 'ai price negotiator', 'ai deal finder ai', 'ai review analyzer',
  'ai pet care', 'ai vet advisor', 'ai animal identifier ai', 'ai pet training ai', 'ai dog breed identifier',
  'ai plant care', 'ai plant disease detector', 'ai garden planner ai', 'ai crop advisor', 'ai soil analysis',
  'ai car advisor', 'ai mechanic ai', 'ai fault diagnosis ai', 'ai driving coach', 'ai route optimizer ai',
  'ai safety analyzer', 'ai risk predictor', 'ai fraud detector', 'ai spam detector', 'ai phishing detector',

  // ── Speed & Safety / Traffic / Radar ─────────────────────────────────
  'speed camera', 'radar detector', 'speed trap', 'traffic camera', 'red light camera',
  'speed limit', 'overspeed alert', 'speed warning', 'speed checker', 'speedometer',
  'gps speedometer', 'hud speedometer', 'car speedometer', 'bike speedometer', 'digital speedometer',
  'police radar', 'radar alert', 'laser detector', 'lidar detector', 'speed gun',
  'traffic alert', 'road hazard', 'accident alert', 'road conditions', 'road report',
  'dashcam', 'car camera', 'drive recorder', 'dash recorder', 'blackbox car',
  'drive safe', 'safe driving', 'driver score', 'driving behavior', 'harsh braking',
  'drunk driving', 'drowsy driving', 'fatigue alert', 'driver alert', 'eyes on road',
  'traffic jam', 'traffic update', 'congestion alert', 'road closure', 'detour',
  'waze clone', 'google maps clone', 'here maps', 'tomtom', 'offline gps',
  'toll calculator', 'toll road', 'highway info', 'motorway app', 'expressway',
  'fuel price', 'petrol price', 'gas station', 'nearest pump', 'fuel tracker',
  'parking meter', 'parking timer', 'parking reminder', 'parking ticket', 'parking finder',
  'car wash', 'car service', 'mechanic finder', 'breakdown assist', 'tow truck',
  'road trip planner', 'route optimizer', 'multi stop route', 'waypoint planner', 'convoy app',

  // ── Navigation & Maps ────────────────────────────────────────────────
  'gps navigation', 'offline maps', 'route planner', 'compass app', 'maps navigation',
  'hiking maps', 'trail maps', 'topo maps', 'satellite maps', 'street view',
  'indoor navigation', 'mall map', 'airport map', 'hospital map', 'campus map',
  'live tracking', 'location sharing', 'family locator', 'friend locator', 'employee tracker',
  'asset tracker', 'vehicle tracker', 'fleet tracker', 'delivery tracker', 'parcel tracker',
  'geocaching', 'treasure hunt', 'ar navigation', 'turn by turn', 'voice navigation',
  'marine navigation', 'boat gps', 'fishing spots', 'anchor alarm', 'tide app',
  'aviation maps', 'pilot app', 'airspace', 'notam', 'weather aviation',
  'surveying app', 'land survey', 'area calculator', 'distance calculator', 'elevation',
  'what3words', 'plus codes', 'coordinate converter', 'latitude longitude', 'grid reference',

  // ── Vehicle & Automotive ─────────────────────────────────────────────
  'car maintenance', 'ev charging', 'obd scanner', 'obd2 app', 'car diagnostic',
  'engine check', 'fault codes', 'dtc codes', 'car health', 'vehicle report',
  'car history', 'vin decoder', 'number plate', 'vehicle lookup', 'registration check',
  'fuel economy', 'mpg tracker', 'fuel consumption', 'mileage tracker', 'logbook',
  'car insurance', 'motor insurance', 'insurance compare', 'ncb tracker', 'policy renewal',
  'car rental', 'self drive', 'vehicle hire', 'lease calculator', 'emi car',
  'electric vehicle', 'ev range', 'ev battery', 'charging station', 'ev planner',
  'motorcycle app', 'bike maintenance', 'bikers community', 'ride log', 'moto tracker',
  'truck app', 'lorry tracker', 'hgv app', 'driver log', 'tachograph',
  'car audio', 'equalizer car', 'subwoofer app', 'car remote', 'car alarm',
  'reverse camera', 'parking sensor', 'blind spot', 'lane assist', 'cruise control',

  // ── Security & Surveillance ───────────────────────────────────────────
  'cctv viewer', 'ip camera', 'security camera', 'home security', 'baby monitor',
  'nanny cam', 'pet camera', 'doorbell camera', 'smart lock', 'access control',
  'motion detector', 'intruder alert', 'burglar alarm', 'fire alarm', 'smoke detector',
  'flood sensor', 'gas detector', 'co detector', 'temperature monitor', 'humidity monitor',
  'spy detector', 'hidden camera detector', 'rf detector', 'bug detector', 'eavesdrop',
  'anti theft', 'phone tracker', 'find my phone', 'phone lock', 'remote wipe',
  'cyber security', 'hack detector', 'firewall app', 'intrusion detection', 'network security',
  'vpn app', 'proxy app', 'tor browser', 'dark web', 'anonymous browser',
  'encrypted chat', 'secure messenger', 'end to end encryption', 'private chat', 'disappearing messages',
  'two factor auth', '2fa app', 'authenticator app', 'otp generator', 'password vault',

  // ── Smart Home & IoT ─────────────────────────────────────────────────
  'smart home', 'home automation', 'iot app', 'alexa app', 'google home',
  'smart bulb', 'smart light', 'philips hue', 'smart switch', 'smart plug',
  'smart thermostat', 'ac control', 'hvac app', 'temperature control', 'smart fan',
  'smart tv remote', 'universal remote', 'ir blaster', 'tv controller', 'set top box',
  'smart speaker', 'speaker control', 'multi room audio', 'sonos app', 'bose app',
  'smart fridge', 'smart washer', 'smart oven', 'kitchen iot', 'appliance control',
  'smart garden', 'irrigation control', 'plant watering', 'soil sensor', 'greenhouse',
  'energy monitor', 'electricity tracker', 'solar panel', 'power consumption', 'smart meter',
  'water meter', 'gas meter', 'utility tracker', 'bill predictor', 'energy saver',
  'zigbee', 'z-wave', 'mqtt', 'home assistant', 'tuya app',

  // ── Emergency & Safety ───────────────────────────────────────────────
  'emergency sos', 'sos app', 'panic button', 'safety app', 'personal safety',
  'women safety', 'child safety', 'elder safety', 'lone worker', 'night safety',
  'fake call', 'escape call', 'safe walk', 'safe route', 'crime map',
  'earthquake app', 'tsunami alert', 'flood warning', 'cyclone tracker', 'disaster alert',
  'amber alert', 'missing person', 'find missing', 'child abduction', 'kidnap alert',
  'first aid guide', 'cpr guide', 'choking guide', 'burn treatment', 'snake bite',
  'poison control', 'drug interaction', 'allergy emergency', 'epipen guide', 'anaphylaxis',
  'fire escape', 'evacuation plan', 'shelter finder', 'bunker map', 'survival guide',
  'offline survival', 'wilderness survival', 'bushcraft', 'prepper app', 'emergency kit',

  // ── Weather & Environment ────────────────────────────────────────────
  'weather forecast', 'rain alert', 'storm tracker', 'weather radar', 'lightning tracker',
  'hurricane tracker', 'tornado alert', 'blizzard warning', 'frost alert', 'heatwave',
  'air quality', 'aqi monitor', 'pollution tracker', 'uv index', 'pollen tracker',
  'tide app', 'wave forecast', 'wind speed', 'barometer', 'pressure tracker',
  'astronomy app', 'star map', 'planet finder', 'moon phase', 'solar eclipse',
  'sunrise sunset', 'golden hour', 'blue hour', 'weather photography', 'cloud identifier',
  'weather station', 'personal weather', 'microclimate', 'weather history', 'climate data',

  // ── Nature & Outdoors ────────────────────────────────────────────────
  'bird watching', 'bird identifier', 'plant identifier', 'flower identifier', 'tree identifier',
  'mushroom identifier', 'insect identifier', 'animal identifier', 'fish identifier', 'snake identifier',
  'nature sounds', 'wildlife app', 'national park', 'nature trail', 'forest app',
  'hunting app', 'fishing app', 'fly fishing', 'hunting season', 'game tracker',
  'camping app', 'campsite finder', 'tent guide', 'survival skills', 'foraging app',
  'rock identifier', 'mineral app', 'gem finder', 'fossil guide', 'geology app',
  'sky map', 'constellation', 'meteor shower', 'iss tracker', 'satellite tracker',

  // ── Sports & Recreation ───────────────────────────────────────────────
  'sports tracker', 'activity tracker', 'workout log', 'training plan', 'coach app',
  'golf gps', 'golf scorecard', 'golf handicap', 'course finder', 'golf stats',
  'tennis score', 'badminton score', 'squash app', 'table tennis', 'pickleball',
  'cricket score', 'cricket live', 'fantasy cricket', 'dream11 clone', 'cricket stats',
  'football score', 'fantasy football', 'fpl app', 'football stats', 'match predictor',
  'basketball score', 'nba app', 'fantasy basketball', 'boxing app', 'mma tracker',
  'cycling route', 'strava clone', 'cycling computer', 'bike fitting', 'power meter',
  'swimming log', 'swim tracker', 'pool finder', 'swim coach', 'triathlon',
  'marathon training', 'race tracker', 'running pace', 'vo2 max', 'heart rate zone',
  'skiing app', 'snowboard app', 'slope finder', 'ski resort', 'avalanche',
  'skateboard app', 'surf app', 'wave finder', 'surf forecast', 'kitesurfing',
  'climbing app', 'bouldering', 'wall climbing', 'route setter', 'climbing grade',
  'archery app', 'shooting range', 'target practice', 'gun app', 'ammo tracker',
  'esports app', 'gaming tournament', 'bracket maker', 'leaderboard', 'rank tracker',

  // ── Music & Audio ────────────────────────────────────────────────────
  'music player', 'equalizer', 'bass booster', 'sound effects', 'audio enhancer',
  'guitar tuner', 'instrument tuner', 'metronome', 'chord finder', 'tab viewer',
  'beat maker', 'drum machine', 'music production', 'daw mobile', 'loop maker',
  'mixing app', 'dj app', 'scratching app', 'crossfader', 'bpm detector',
  'sheet music', 'music notation', 'score reader', 'sight reading', 'ear training',
  'vocal trainer', 'pitch corrector', 'autotune', 'voice changer', 'voice effects',
  'karaoke app', 'lyrics app', 'sing along', 'vocal remover', 'instrumental maker',
  'noise cancellation', 'hearing aid', 'tinnitus relief', 'sound therapy', 'binaural beats',
  'podcast creator', 'podcast host', 'rss podcast', 'audio editor', 'waveform editor',
  'radio streaming', 'internet radio', 'fm radio', 'am radio', 'scanner radio',

  // ── Photography (Extended) ───────────────────────────────────────────
  'raw camera', 'manual camera', 'dslr control', 'tethered shooting', 'intervalometer',
  'astro photography', 'macro photography', 'underwater camera', 'action camera', 'gopro app',
  'photogrammetry', '3d scan', 'lidar scan', 'ar measurement', 'room scanner',
  'photo metadata', 'exif viewer', 'geotagging', 'photo map', 'location photo',
  'photo culling', 'photo organizer', 'duplicate finder', 'photo archive', 'photo migration',
  'lightroom mobile', 'photoshop mobile', 'snapseed clone', 'vsco clone', 'afterlight',
  'drone app', 'drone controller', 'fpv drone', 'drone footage', 'aerial photo',

  // ── Communication (Extended) ─────────────────────────────────────────
  'walkie talkie', 'push to talk', 'two way radio', 'ham radio', 'cb radio',
  'satellite communicator', 'mesh network', 'offline chat', 'bluetooth chat', 'p2p chat',
  'email tracker', 'read receipt', 'email scheduler', 'bulk email', 'email signature',
  'fax app', 'efax', 'send fax', 'receive fax', 'fax to email',
  'virtual number', 'second phone number', 'burner number', 'sms online', 'receive sms',
  'video conference', 'webinar app', 'screen share', 'whiteboard video', 'virtual background',
  'live caption', 'subtitles live', 'interpreter', 'sign language video', 'accessibility chat',

  // ── Shopping & Commerce ───────────────────────────────────────────────
  'shopping deals', 'price compare', 'cashback', 'resale', 'coupon',
  'grocery delivery', 'fashion shopping', 'marketplace', 'auction', 'parcel tracker',
  'barcode scanner shop', 'product scanner', 'price scanner', 'amazon scanner', 'review checker',
  'secondhand shop', 'thrift store', 'preloved', 'vintage shop', 'swap app',
  'group buying', 'flash sale', 'daily deals', 'clearance sale', 'liquidation',
  'pre order app', 'crowdfunding', 'kickstarter clone', 'indiegogo clone', 'product launch',
  'subscription box', 'beauty box', 'snack box', 'book box', 'toy subscription',
  'rent app', 'borrow app', 'peer rental', 'equipment rental', 'tool rental',
  'ticket booking', 'event ticket', 'concert ticket', 'movie ticket', 'sports ticket',
  'gift card', 'voucher app', 'e-gift', 'gift registry', 'wish list',

  // ── Kids & Parenting ─────────────────────────────────────────────────
  'kids app', 'toddler app', 'baby app', 'child learning', 'kids games',
  'parental control', 'screen time kids', 'kids browser', 'safe youtube', 'kids youtube',
  'bedtime stories', 'kids audiobook', 'nursery rhymes', 'lullaby app', 'sleep stories',
  'kids drawing', 'kids coloring', 'kids paint', 'kids creativity', 'kids art',
  'kids math', 'kids alphabet', 'kids spelling', 'phonics app', 'reading app kids',
  'baby monitor', 'baby sleep', 'baby feeding', 'diaper tracker', 'growth tracker',
  'pregnancy app', 'contraction timer', 'kick counter', 'prenatal yoga', 'birth plan',
  'family organizer', 'family calendar', 'chore chart', 'allowance tracker', 'kids reward',
  'co parenting', 'custody schedule', 'family locator', 'kids gps', 'school bus tracker',

  // ── Religion & Spirituality ───────────────────────────────────────────
  'quran app', 'prayer times', 'qibla direction', 'islamic app', 'namaz app',
  'hadith app', 'dua app', 'hijri calendar', 'ramadan app', 'zakat calculator',
  'asma ul husna', 'darood', 'wazifa', 'tasbih counter', 'dhikr app',
  'bible app', 'daily verse', 'devotional app', 'church app', 'christian app',
  'bhagavad gita', 'hindu app', 'temple app', 'aarti app', 'puja app',
  'buddhist app', 'meditation buddhist', 'dharma', 'sikh app', 'gurbani',
  'jewish app', 'torah', 'shabbat', 'jewish calendar', 'synagogue',
  'spiritual app', 'chakra', 'tarot', 'astrology', 'numerology',
  'horoscope', 'birth chart', 'kundli', 'vastu', 'feng shui',

  // ── Finance (Extended) ───────────────────────────────────────────────
  'stock screener', 'technical analysis', 'chart patterns', 'candlestick', 'trading signals',
  'copy trading', 'social trading', 'paper trading', 'demo trading', 'backtesting',
  'options calculator', 'greeks calculator', 'iv rank', 'options chain', 'put call',
  'real estate invest', 'rental yield', 'cap rate', 'property valuation', 'mortgage',
  'gold investment', 'silver price', 'precious metals', 'commodity futures', 'cfd trading',
  'peer lending', 'crowdlending', 'invoice finance', 'revenue based', 'angel invest',
  'credit score', 'credit report', 'credit builder', 'cibil score', 'equifax',
  'emi calculator', 'loan compare', 'interest calculator', 'compound interest', 'rule of 72',

  // ── Health (Extended) ────────────────────────────────────────────────
  'telehealth', 'online doctor', 'video consultation', 'prescription app', 'medicine delivery',
  'lab test booking', 'health checkup', 'diagnostic center', 'radiology report', 'pathology',
  'blood bank', 'organ donor', 'plasma donor', 'eye bank', 'medical id',
  'wheelchair app', 'disability app', 'accessibility app', 'screen reader', 'hearing loop',
  'diabetes app', 'glucose tracker', 'insulin tracker', 'cgm app', 'hba1c',
  'cancer tracker', 'chemotherapy log', 'radiation schedule', 'palliative care', 'hospice',
  'addiction recovery', 'sobriety tracker', 'aa meeting finder', 'rehab finder', 'drug test',
  'quit smoking', 'nicotine tracker', 'vaping quit', 'alcohol tracker', 'sober app',

  // ── Education (Extended) ────────────────────────────────────────────
  'math calculator', 'equation solver', 'algebra app', 'calculus app', 'statistics app',
  'geometry app', 'trigonometry', 'graph plotter', 'desmos clone', 'wolfram clone',
  'periodic table', 'chemistry solver', 'molecular viewer', 'physics simulator', 'circuit simulator',
  'anatomy app', 'body atlas', '3d anatomy', 'medical study', 'nursing app',
  'law app', 'legal study', 'case law', 'constitution app', 'legal dictionary',
  'stock market learn', 'investing basics', 'crypto learn', 'defi learn', 'nft learn',
  'public speaking', 'debate practice', 'presentation skills', 'storytelling', 'writing skills',
  'speed math', 'abacus app', 'mental math', 'vedic math', 'math tricks',

  // ── Productivity (Extended) ──────────────────────────────────────────
  'meeting scheduler', 'calendar booking', 'appointment app', 'slot booking', 'availability',
  'email newsletter', 'drip campaign', 'marketing automation', 'social media scheduler', 'post planner',
  'link shortener', 'bio link', 'qr generator', 'barcode generator', 'vcard maker',
  'invoice generator', 'quote maker', 'proposal builder', 'contract template', 'nda generator',
  'signature capture', 'e-sign', 'document sign', 'form builder', 'survey creator',
  'team management', 'resource planner', 'capacity planner', 'gantt chart', 'milestone tracker',
  'client portal', 'customer portal', 'vendor portal', 'supplier app', 'procurement',
  'translation workflow', 'localization', 'content management', 'cms app', 'headless cms',

  // ── Gaming Utilities ─────────────────────────────────────────────────
  'game booster', 'gaming mode', 'fps booster', 'lag fix', 'ping reducer',
  'game recording', 'gameplay capture', 'streaming overlay', 'obs mobile', 'stream deck',
  'controller mapper', 'keymapper', 'gamepad app', 'joystick app', 'trigger app',
  'game wallet', 'gift card gaming', 'game topup', 'uc purchase', 'robux app',
  'game finder', 'new games', 'game discovery', 'indie games', 'free games',
  'cheat engine mobile', 'save editor', 'mod menu', 'hack tool game', 'game trainer',
  'gaming vpn', 'gaming dns', 'gaming proxy', 'server selector', 'region changer',

  // ── Miscellaneous & Niche ─────────────────────────────────────────────
  'metal detector', 'treasure detector', 'gold detector', 'mine detector', 'stud finder',
  'emf detector', 'ghost detector', 'paranormal app', 'evp recorder', 'spirit box',
  'lie detector', 'polygraph app', 'truth or dare', 'hypnosis app', 'subliminal',
  'dice roller', 'random generator', 'lottery picker', 'lucky numbers', 'coin flip',
  'stopwatch lap', 'interval timer', 'tabata timer', 'boxing round timer', 'chess clock',
  'tally counter', 'clicker counter', 'people counter', 'inventory counter', 'score keeper',
  'translator camera', 'document translate', 'website translate', 'menu translate', 'sign translate',
  'font identifier', 'color picker', 'hex color', 'pantone', 'color palette',
  'sound meter', 'decibel meter', 'noise level', 'audio spectrum', 'frequency analyzer',
  'mirror app', 'magnifier', 'loupe', 'zoom camera', 'telephoto',
  'weather station diy', 'raspberry pi', 'arduino app', 'esp32', 'gpio controller',
  'ham radio log', 'frequency scanner', 'signal strength', 'rf analyzer', 'spectrum analyzer',
  'morse code', 'cipher decoder', 'encryption app', 'steganography', 'secret message',
  'vintage camera', 'film simulation', 'lomography', 'pinhole', 'toy camera',
  'face recognition', 'face unlock', 'facial analysis', 'age estimator', 'emotion detector',
  'object recognition', 'image search', 'reverse image', 'visual search', 'product recognition',
  'receipt scanner', 'expense ocr', 'bill scanner', 'menu scanner', 'label scanner',
  'handwriting recognition', 'handwriting to text', 'math ocr', 'formula scanner', 'table ocr',
  'nfc reader', 'nfc writer', 'rfid scanner', 'smart tag', 'bluetooth beacon',
  'wifi password', 'wifi sharing', 'hotspot manager', 'data usage', 'bandwidth monitor',
  'sleep apnea', 'snoring app', 'cpap tracker', 'sleep analysis', 'sleep lab',
  'lucid dreaming', 'dream journal', 'dream analysis', 'sleep cycle', 'smart alarm',
  'hypnotherapy', 'nlp app', 'self improvement', 'confidence building', 'social anxiety',
  'couple app', 'relationship tracker', 'anniversary reminder', 'love language', 'couples games',
  'memory book', 'life story', 'biography app', 'timeline life', 'legacy app',
  'genealogy', 'family tree', 'ancestry', 'dna app', 'heritage app',
  'coin collection', 'stamp collection', 'card collection', 'toy collection', 'book collection',
  'wine collection', 'whiskey tracker', 'beer log', 'spirits guide', 'cellar app',
  'tattoo design', 'tattoo finder', 'piercing guide', 'body art', 'henna design',
  'telescope app', 'planet viewer', 'galaxy explorer', 'space news', 'space app',
  'climate change', 'carbon footprint', 'eco app', 'sustainability', 'recycling guide',
  'volunteer app', 'charity app', 'crowdfunding donate', 'blood donation', 'food donation',
  'legal aid', 'lawyer finder', 'court dates', 'bail tracker', 'legal document',
  'notary app', 'apostille', 'document legalization', 'affidavit', 'sworn statement',
  'voting app', 'election tracker', 'political news', 'government services', 'citizen app',
  'passport app', 'visa tracker', 'immigration', 'work permit', 'residency app',
  'military app', 'veteran app', 'defence news', 'army fitness', 'tactical app',
  'police app', 'crime report', 'neighborhood watch', 'community safety', 'tip line',
  'firefighter app', 'incident command', 'hazmat guide', 'rescue app', 'sar app',
])];

const TRENDING_CATEGORIES = Object.keys(gplay.category);

const TRENDING_COUNTRIES = [
  'us', 'gb', 'ca', 'au', 'nz', 'ie',
  'pk', 'af', 'cn', 'in', 'bd', 'lk', 'np', 'bt', 'mv',
  'id', 'my', 'ph', 'sg', 'th', 'vn', 'kh', 'la', 'mm',
  'jp', 'kr', 'tw', 'hk', 'mo',
  'de', 'fr', 'it', 'es', 'pt', 'nl', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi',
  'is', 'pl', 'cz', 'sk', 'ro', 'hu', 'gr', 'tr', 'ua', 'bg', 'hr', 'si',
  'rs', 'ba', 'mk', 'al', 'ee', 'lv', 'lt',
  'br', 'mx', 'ar', 'cl', 'co', 'pe', 'uy', 'py', 'bo', 'ec', 've',
  'cr', 'pa', 'gt', 'sv', 'hn', 'ni', 'do',
  'za', 'ng', 'ke', 'eg', 'ma', 'dz', 'tn', 'gh', 'tz', 'ug', 'et',
  'sa', 'ae', 'qa', 'kw', 'bh', 'om', 'il', 'jo', 'lb', 'iq',
  'ru', 'kz', 'uz', 'az', 'ge', 'am',
];

const TRENDING_CACHE_TTL_MS = 15 * 60 * 1000;
const trendingCache = new Map();

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

function categoryIdsForDiscovery() {
  return Object.keys(gplay.category).filter(id =>
    !['APPLICATION', 'GAME', 'FAMILY'].includes(id)
  );
}

function uniqueByAppId(items) {
  const seen = new Set();
  const results = [];

  for (const item of items.flat()) {
    if (!item?.appId || seen.has(item.appId)) continue;
    seen.add(item.appId);
    results.push(item);
  }

  return results;
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

function candidateTargetForAllCategoryDiscovery(fetchNum, wantsDateFilter) {
  const multiplier = wantsDateFilter ? 8 : 5;
  const minimum = wantsDateFilter ? 140 : 90;
  const maximum = wantsDateFilter ? 260 : 180;
  return Math.min(Math.max(fetchNum * multiplier, minimum), maximum);
}

function allCategorySearchTerms(categoryId) {
  const selected = categoryValue(categoryId);

  if (selected?.startsWith('GAME_')) {
    const label = selected.toLowerCase().replace(/_/g, ' ');
    return [`new ${label}`, `${label} 2026`];
  }

  const label = selected.toLowerCase().replace(/_/g, ' ');
  return [`new ${label} app`, `best ${label} app`];
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

async function fallbackSearchIds(term, { lang, country, num }) {
  const url = new URL('https://play.google.com/store/search');
  url.searchParams.set('q', term);
  url.searchParams.set('c', 'apps');
  url.searchParams.set('hl', lang);
  url.searchParams.set('gl', country);

  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
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
}

async function searchCandidates(opts, { allowFallback = true, detailFallback = false } = {}) {
  const results = await gplay.search(opts).catch(() => []);
  if (results.length) return results;
  if (!allowFallback) return [];

  const ids = await fallbackSearchIds(opts.term, {
    lang: opts.lang || 'en',
    country: opts.country || 'us',
    num: opts.num || 20,
  }).catch(() => []);

  const candidates = ids.map(appId => ({
    appId,
    url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}`,
  }));

  return detailFallback
    ? enrichWithDetails(candidates, { lang: opts.lang || 'en', country: opts.country || 'us' })
    : candidates;
}

/**
 * Waits for the requested number of milliseconds.
 * @param {number} ms Milliseconds to pause.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Converts trending discovery query params into bounded runtime options.
 * @param {object} query Express query object.
 * @returns {{daysBack:number,minRating:number,minInstalls:number,maxResults:number,country:string,lang:string}}
 */
function normalizeTrendingParams(query) {
  const parseBoundedInt = (value, fallback, min, max) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  };
  const parseBoundedFloat = (value, fallback, min, max) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  };

  return {
    daysBack: parseBoundedInt(query.daysBack, 30, 0, 365),
    minRating: parseBoundedFloat(query.minRating, 0, 0, 5),
    minInstalls: parseBoundedInt(query.minInstalls, 0, 0, Number.MAX_SAFE_INTEGER),
    maxResults: parseBoundedInt(query.maxResults, 5, 1, 20),
    country: String(query.country || '').trim().toLowerCase(),
    lang: String(query.lang || 'en').trim().toLowerCase() || 'en',
  };
}

/**
 * Resolves the country scope for a trending scan.
 * @param {string} country Country code, worldwide, or all.
 * @returns {string[]} Country codes to scan.
 */
function countriesForTrending(country) {
  if (['worldwide', 'all', 'global'].includes(country)) return TRENDING_COUNTRIES;
  return country ? [country] : [''];
}

/**
 * Adds a country option only when a country filter is active.
 * @param {string} country Country code or empty string.
 * @returns {{country?:string}}
 */
function countryOption(country) {
  return country ? { country } : {};
}

/**
 * Creates a stable cache key for trending discovery params.
 * @param {ReturnType<typeof normalizeTrendingParams>} params Normalized discovery params.
 * @returns {string}
 */
function cacheKeyForTrending(params) {
  return JSON.stringify(params);
}

/**
 * Runs async work in bounded batches and waits between batches.
 * @template T,U
 * @param {T[]} items Items to process.
 * @param {number} limit Max parallel work per batch.
 * @param {(item:T,index:number)=>Promise<U>} mapper Async mapper.
 * @param {number} batchDelayMs Delay between batches.
 * @returns {Promise<PromiseSettledResult<U>[]>}
 */
async function runLimitedBatches(items, limit, mapper, batchDelayMs) {
  const settled = [];

  for (let start = 0; start < items.length; start += limit) {
    const batch = items.slice(start, start + limit);
    const batchResults = await Promise.allSettled(
      batch.map((item, offset) => mapper(item, start + offset))
    );
    settled.push(...batchResults);

    if (start + limit < items.length && batchDelayMs > 0) {
      await delay(batchDelayMs);
    }
  }

  return settled;
}

/**
 * Calculates a simple trend score using installs and app rating.
 * @param {object} app App object from google-play-scraper.
 * @returns {number}
 */
function scoreForTrending(app) {
  return (app.minInstalls || app.maxInstalls || 0) * (app.score || 0);
}

/**
 * Checks if an app was released within the requested recency window.
 * @param {object} app App object with a released field.
 * @param {number} daysBack Recency window in days; 0 disables the filter.
 * @returns {boolean}
 */
function isReleasedWithinDays(app, daysBack) {
  if (!daysBack || daysBack <= 0) return true;

  const released = app.released ? new Date(app.released) : null;
  if (!released || isNaN(released.getTime())) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  return released >= cutoff;
}

/**
 * Returns an unexpired cache entry and drops stale entries.
 * @param {string} key Cache key.
 * @returns {{cachedAt:number,response:object}|null}
 */
function getTrendingCacheEntry(key) {
  const entry = trendingCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt >= TRENDING_CACHE_TTL_MS) {
    trendingCache.delete(key);
    return null;
  }

  return entry;
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
      price, contentRating, releasedAfter, releasedBefore, allCategories = '',
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
    const searchAllCategories = allCategories === 'true' && !category;
    const needsDetailEnrichment = Boolean(wantsDateFilter || contentRating || (qTerm && category));

    if (searchAllCategories) {
      const categoryIds = categoryIdsForDiscovery();
      const targetCandidates = candidateTargetForAllCategoryDiscovery(fetchNum, wantsDateFilter);

      if (qTerm) {
        const keywordTarget = Math.min(Math.max(fetchNum * 2, 20), 80);
        results = await searchCandidates({
          term: qTerm,
          num: keywordTarget,
          lang,
          country,
          ...(sortMap[sort] != null ? { sort: sortMap[sort] } : {}),
          fullDetail: false,
        }, { detailFallback: true });
      } else if (wantsDateFilter) {
        const tasks = categoryIds.flatMap(categoryId =>
          allCategorySearchTerms(categoryId).map(term => ({ categoryId, term }))
        );
        const perTerm = Math.max(2, Math.ceil(targetCandidates / tasks.length));
        const batches = await mapLimit(tasks, 6, ({ categoryId, term }) =>
          searchCandidates({
            term,
            num: Math.min(perTerm, 12),
            lang,
            country,
            sort: gplay.sort.NEWEST,
            category: categoryValue(categoryId),
            fullDetail: false,
          }, { allowFallback: false }).catch(() => [])
        );
        results = uniqueByAppId(batches).slice(0, targetCandidates);
        if (!results.length) {
          const fallbackBatches = await mapLimit(termsForDateDiscovery(''), 6, term =>
            searchCandidates({
              term,
              num: Math.ceil(targetCandidates / termsForDateDiscovery('').length),
              lang,
              country,
              sort: gplay.sort.NEWEST,
              fullDetail: false,
            }).catch(() => [])
          );
          results = uniqueByAppId(fallbackBatches).slice(0, targetCandidates);
        }
      } else {
        const collections = [
          gplay.collection.TOP_FREE,
          gplay.collection.TOP_PAID,
          gplay.collection.GROSSING,
        ];
        const tasks = categoryIds.flatMap(categoryId =>
          collections.map(collection => ({ categoryId, collection }))
        );
        const perTask = Math.max(1, Math.ceil(targetCandidates / tasks.length));
        const batches = await mapLimit(tasks, 8, ({ categoryId, collection }) =>
          gplay.list({
            collection,
            category: categoryValue(categoryId),
            num: Math.min(perTask + 1, 10),
            lang,
            country,
          }).catch(() => [])
        );
        results = uniqueByAppId(batches).slice(0, targetCandidates);
      }
    } else if (qTerm) {
      // ── keyword search ──────────────────────────────────────────────────
      results = await searchCandidates({
        term: qTerm,
        num: wantsDateFilter ? Math.min(Math.max(fetchNum * 4, 80), 220) : fetchNum,
        lang,
        country,
        ...(sortMap[sort] != null ? { sort: sortMap[sort] } : {}),
        ...(category ? { category: categoryValue(category) } : {}),
        fullDetail: false,
      }, { detailFallback: !wantsDateFilter });
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
        searchCandidates({
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

    res.json({
      total: apps.length,
      apps,
      enriched: needsDetailEnrichment,
      scanned,
      scope: searchAllCategories ? 'all-categories' : 'standard',
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// Autocomplete suggestions
app.get('/api/suggest', async (req, res) => {
  try {
    const { q = '', lang = 'en', country = 'us' } = req.query;
    const term = q.trim();
    if (term.length < 2) return res.json([]);

    const results = await gplay.suggest({ term, lang, country });
    res.json(Array.isArray(results) ? results.slice(0, 8) : []);
  } catch (err) {
    console.error('Suggest error:', err.message);
    res.status(500).json({ error: err.message || 'Could not fetch suggestions' });
  }
});

// Trending discovery sources
app.get('/api/trending-categories', (_req, res) => {
  res.json({
    categories: TRENDING_CATEGORIES,
    keywords: TRENDING_KEYWORDS,
    countries: TRENDING_COUNTRIES,
  });
});

// Trending discovery cache status
app.get('/api/trending-cache-status', (req, res) => {
  const params = normalizeTrendingParams(req.query);
  const key = cacheKeyForTrending(params);
  const entry = getTrendingCacheEntry(key);

  if (!entry) {
    return res.json({ cachedAt: null, totalApps: 0, expiresIn: 0 });
  }

  const expiresIn = Math.max(0, TRENDING_CACHE_TTL_MS - (Date.now() - entry.cachedAt));
  res.json({
    cachedAt: new Date(entry.cachedAt).toISOString(),
    totalApps: entry.response.total || 0,
    expiresIn,
  });
});

// Auto-discover trending and recently released apps across categories + keywords
app.get('/api/trending-discovery', async (req, res) => {
  try {
    const params = normalizeTrendingParams(req.query);
    const key = cacheKeyForTrending(params);
    const cached = getTrendingCacheEntry(key);

    if (cached) {
      return res.json(cached.response);
    }

    const { daysBack, minRating, minInstalls, maxResults, country, lang } = params;
    const countries = countriesForTrending(country);
    const sourceTasks = [
      ...countries.flatMap(sourceCountry => TRENDING_CATEGORIES.map(category => ({
        type: 'category',
        source: category,
        country: sourceCountry,
        run: () => gplay.list({
          category: categoryValue(category),
          collection: gplay.collection.TOP_FREE,
          num: maxResults,
          lang,
          ...countryOption(sourceCountry),
        }).then(items => items.map(item => ({ ...item, _sourceCountry: sourceCountry }))),
      }))),
      ...countries.flatMap(sourceCountry => TRENDING_KEYWORDS.map(keyword => ({
        type: 'keyword',
        source: keyword,
        country: sourceCountry,
        run: () => gplay.search({
          term: keyword,
          num: maxResults,
          sort: gplay.sort.NEWEST,
          lang,
          ...countryOption(sourceCountry),
        }).then(items => items.map(item => ({ ...item, _sourceCountry: sourceCountry }))),
      }))),
    ];

    const settled = await runLimitedBatches(sourceTasks, 6, task => task.run(), 300);
    const candidateBatches = [];

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        candidateBatches.push(Array.isArray(result.value) ? result.value : []);
        return;
      }

      const task = sourceTasks[index];
      console.error(
        `Trending ${task.type} failed (${task.source}, ${task.country || 'default country'}):`,
        result.reason?.message || result.reason
      );
    });

    const candidates = uniqueByAppId(candidateBatches);
    const detailed = await mapLimit(candidates, 4, async (candidate) => {
      try {
        return await gplay.app({
          appId: candidate.appId,
          lang,
          ...countryOption(candidate._sourceCountry || countries[0]),
        });
      } catch {
        return candidate;
      }
    });

    let apps = detailed
      .map(pickUseful)
      .filter(Boolean)
      .filter(app => isReleasedWithinDays(app, daysBack))
      .filter(app => (app.score || 0) >= minRating)
      .filter(app => (app.minInstalls || app.maxInstalls || 0) >= minInstalls);

    apps = apps.sort((a, b) => {
      const scoreDiff = scoreForTrending(b) - scoreForTrending(a);
      if (scoreDiff !== 0) return scoreDiff;

      const bDate = b.released ? new Date(b.released).getTime() : 0;
      const aDate = a.released ? new Date(a.released).getTime() : 0;
      return bDate - aDate;
    });

    const response = {
      total: apps.length,
      sources: {
        categories: TRENDING_CATEGORIES.length,
        keywords: TRENDING_KEYWORDS.length,
        countries: countries.length,
        countryScope: country || 'default',
        scans: sourceTasks.length,
      },
      apps,
    };

    trendingCache.set(key, {
      cachedAt: Date.now(),
      response,
    });

    res.json(response);
  } catch (err) {
    console.error('Trending discovery error:', err.message);
    res.status(500).json({ error: err.message || 'Trending discovery failed' });
  }
});

// App detail by ID
app.get('/api/app/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lang = 'en', country = 'us' } = req.query;
    const result = await gplay.app({ appId, lang, country });
    const appData = pickUseful(result);
    if (appData) {
      appData.description = result.description || null;
      appData.extractedKeywords = extractMetadataKeywords(result);
    }
    res.json(appData);
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

// ASO Keyword Intelligence Analysis
app.get('/api/keyword-analysis', async (req, res) => {
  try {
    const { q = '', country = 'us', lang = 'en' } = req.query;
    const keyword = q.trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Search keyword is required (q param)' });
    }
    const analysis = await analyzeKeyword(keyword, { country, lang });
    res.json(analysis);
  } catch (err) {
    console.error('Keyword analysis error:', err.message);
    res.status(500).json({ error: err.message || 'Keyword analysis failed' });
  }
});

// ASO Multi-Country Keyword Comparison
app.get('/api/keyword-countries', async (req, res) => {
  try {
    const { q = '', countries } = req.query;
    const keyword = q.trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Search keyword is required (q param)' });
    }
    const countryList = countries
      ? countries.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
      : ['us', 'gb', 'in', 'pk', 'de', 'fr', 'br', 'jp'];
    const results = await compareKeywordAcrossCountries(keyword, countryList);
    res.json({ keyword, countries: results });
  } catch (err) {
    console.error('Keyword countries comparison error:', err.message);
    res.status(500).json({ error: err.message || 'Keyword countries comparison failed' });
  }
});

// Extract keywords & metadata density for a given app
app.get('/api/app-keywords/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lang = 'en', country = 'us' } = req.query;
    const app = await gplay.app({ appId, lang, country });
    const keywords = extractMetadataKeywords(app);
    res.json({
      appId,
      title: app.title,
      totalKeywords: keywords.length,
      keywords,
    });
  } catch (err) {
    console.error('App keywords error:', err.message);
    res.status(500).json({ error: err.message || 'Could not extract keywords' });
  }
});

// Serve frontend
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (isDirectRun) {
  const server = app.listen(PORT, () => {
    console.log(`Play Store Explorer running at http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other server or run with PORT=3001 npm start.`);
      process.exit(1);
    }

    throw err;
  });
}

export default app;
