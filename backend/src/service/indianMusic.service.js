const axios = require('axios');
const forge = require('node-forge');

// Provider adapter: all catalog-specific requests and response mapping stay here.
const SEARCH_URL = process.env.INDIAN_MUSIC_SEARCH_URL || 'https://www.jiosaavn.com/api.php';
const PROVIDER_CLIENT = 'jiosaavn-api.php';
const LANGUAGES = ['Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Malayalam', 'Kannada', 'Odia', 'Assamese', 'Urdu', 'Bhojpuri', 'Kashmiri', 'Konkani', 'Manipuri', 'Sanskrit', 'Sindhi', 'Haryanvi', 'Rajasthani', 'Chhattisgarhi'];
const LANGUAGE_ALIASES = {
    hindi: ['hindi', 'hi', 'hin'], punjabi: ['punjabi', 'panjabi', 'pa', 'pan'], tamil: ['tamil', 'ta', 'tam'],
    telugu: ['telugu', 'te', 'tel'], bengali: ['bengali', 'bangla', 'bn', 'ben'], marathi: ['marathi', 'mr', 'mar'],
    gujarati: ['gujarati', 'gu', 'guj'], malayalam: ['malayalam', 'ml', 'mal'], kannada: ['kannada', 'kn', 'kan'],
    odia: ['odia', 'oriya', 'or', 'ori'], assamese: ['assamese', 'as', 'asm'], urdu: ['urdu', 'ur', 'urd'],
    bhojpuri: ['bhojpuri'], kashmiri: ['kashmiri'], konkani: ['konkani'], manipuri: ['manipuri', 'meitei'],
    sanskrit: ['sanskrit'], sindhi: ['sindhi'], haryanvi: ['haryanvi'], rajasthani: ['rajasthani'], chhattisgarhi: ['chhattisgarhi'],
};

// ── Indian Language Weighting Profile ──
// When region=Indian and no specific language chosen, use this weighted distribution.
const INDIAN_LANGUAGE_WEIGHTS = {
    hindi: 50,
    punjabi: 20,
    tamil: 5,
    telugu: 5,
    bengali: 4,
    marathi: 4,
    gujarati: 3,
    malayalam: 3,
    kannada: 3,
    urdu: 3,
};

// Primary languages get priority in search queries
const PRIMARY_LANGUAGES = ['Hindi', 'Punjabi'];
const REGIONAL_LANGUAGES = ['Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Malayalam', 'Kannada'];

function normalizeLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'unknown' || normalized === 'null') return 'Unknown';

    const match = Object.entries(LANGUAGE_ALIASES).find(([language, aliases]) => (
        aliases.includes(normalized) || (language === 'punjabi' && normalized.includes('punjab'))
    ));
    if (!match) return 'Unknown';
    return `${match[0][0].toUpperCase()}${match[0].slice(1)}`;
}

// ── Mood-Specific Search Queries ──
// Multiple targeted queries per mood for richer candidate generation.
const MOOD_SEARCH_QUERIES = {
    sad: {
        hindi: [
            'sad bollywood songs', 'heartbreak hindi songs', 'emotional hindi songs',
            'melancholic hindi', 'broken heart hindi songs', 'late night hindi sad',
            'acoustic hindi sad', 'dard hindi songs', 'judaai hindi songs',
            'bewafa hindi songs', 'sad Arijit Singh', 'sad KK songs',
            'tanha dil hindi', 'rula dene wale gaane', 'gham ke gaane hindi',
        ],
        punjabi: [
            'sad punjabi songs', 'heartbreak punjabi', 'emotional punjabi songs',
            'dard punjabi songs', 'sad punjabi 2024',
        ],
        regional: [
            'sad tamil songs', 'sad telugu songs', 'emotional bengali songs',
        ],
        generic: [
            'sad Bollywood songs', 'heartbreak Bollywood songs',
            'emotional Indian songs', 'melancholy Bollywood',
        ],
    },
    happy: {
        hindi: [
            'happy bollywood songs', 'feel good hindi songs', 'happy hindi songs',
            'upbeat hindi', 'celebration hindi songs', 'good vibes hindi',
            'khushi ke gaane', 'masti hindi songs', 'fun bollywood songs',
            'happy Arijit Singh', 'feel good bollywood',
        ],
        punjabi: [
            'happy punjabi songs', 'feel good punjabi', 'party punjabi songs',
            'bhangra hits', 'upbeat punjabi',
        ],
        regional: [
            'happy tamil songs', 'happy telugu songs',
        ],
        generic: [
            'happy Bollywood songs', 'feel good Bollywood songs',
            'celebration Bollywood songs', 'upbeat Indian songs',
        ],
    },
    energetic: {
        hindi: [
            'energetic hindi songs', 'party hindi songs', 'dance hindi songs',
            'upbeat bollywood', 'high energy hindi', 'workout hindi songs',
            'club hindi songs', 'DJ bollywood remix',
        ],
        punjabi: [
            'energetic punjabi songs', 'bhangra party songs', 'dance punjabi',
            'punjabi DJ songs', 'punjabi party hits',
        ],
        regional: [
            'energetic tamil songs', 'dance telugu songs',
        ],
        generic: [
            'energetic Bollywood songs', 'dance Bollywood songs',
            'party Indian songs', 'high energy Bollywood',
        ],
    },
    chill: {
        hindi: [
            'chill hindi songs', 'calm hindi songs', 'acoustic hindi songs',
            'lofi hindi', 'relaxing hindi songs', 'late night hindi songs',
            'soft hindi songs', 'mellow bollywood',
        ],
        punjabi: [
            'chill punjabi songs', 'soft punjabi', 'acoustic punjabi',
        ],
        regional: [
            'chill tamil songs', 'relaxing telugu songs',
        ],
        generic: [
            'chill Bollywood songs', 'mellow Bollywood songs',
            'acoustic Indian songs', 'lofi Bollywood',
        ],
    },
    relaxed: {
        hindi: [
            'calm hindi songs', 'relaxing hindi songs', 'peaceful hindi',
            'soft hindi songs', 'soothing hindi', 'acoustic hindi songs',
        ],
        punjabi: [
            'soft punjabi songs', 'calm punjabi', 'relaxing punjabi',
        ],
        regional: [],
        generic: [
            'calm Bollywood songs', 'relaxing Indian songs',
            'soothing Bollywood', 'peaceful Bollywood songs',
        ],
    },
    romantic: {
        hindi: [
            'romantic hindi songs', 'love hindi songs', 'romantic bollywood songs',
            'ishq hindi songs', 'pyaar hindi songs', 'romantic Arijit Singh',
            'love bollywood', 'heartfelt hindi songs',
        ],
        punjabi: [
            'romantic punjabi songs', 'love punjabi songs', 'ishq punjabi',
        ],
        regional: [
            'romantic tamil songs', 'love telugu songs',
        ],
        generic: [
            'romantic Bollywood songs', 'love Bollywood songs',
            'romantic Indian songs',
        ],
    },
    confident: {
        hindi: [
            'confident hindi songs', 'attitude hindi songs', 'power hindi songs',
            'swag bollywood songs', 'bold hindi songs', 'rap hindi songs',
        ],
        punjabi: [
            'attitude punjabi songs', 'swag punjabi', 'confident punjabi songs',
        ],
        regional: [],
        generic: [
            'confident Bollywood songs', 'attitude Bollywood songs',
            'powerful Indian songs',
        ],
    },
    motivated: {
        hindi: [
            'motivational hindi songs', 'inspiring hindi songs', 'empowering bollywood',
            'victory hindi songs', 'determination hindi songs',
        ],
        punjabi: [
            'motivational punjabi songs', 'inspiring punjabi',
        ],
        regional: [],
        generic: [
            'motivational Bollywood songs', 'inspiring Bollywood songs',
            'empowering Indian songs',
        ],
    },
    calm: {
        hindi: [
            'calm hindi songs', 'soothing hindi songs', 'peaceful hindi songs',
            'soft hindi music', 'serene bollywood',
        ],
        punjabi: [
            'calm punjabi songs', 'soft punjabi music',
        ],
        regional: [],
        generic: [
            'calm Bollywood songs', 'soothing Bollywood songs',
        ],
    },
};

// ── Mood Scoring Keywords ──
// Positive and negative signals for each mood. Used for SCORING, not gating.
const MOOD_POSITIVE_KEYWORDS = {
    sad: [
        'sad', 'heartbreak', 'broken', 'emotional', 'melancholy', 'lonely', 'tears', 'cry',
        'yaadein', 'judaai', 'bewafa', 'dard', 'adhuri', 'rula', 'tanha', 'gham', 'rona',
        'acoustic', 'slow', 'sorrow', 'pain', 'loss', 'missing', 'separation', 'judai',
        'breakup', 'heart touching', 'alvida', 'wafa', 'tanhai', 'intezaar',
    ],
    happy: [
        'happy', 'feel good', 'upbeat', 'celebration', 'party', 'dance', 'joy', 'fun',
        'sunshine', 'good vibes', 'energetic', 'masti', 'khushi', 'festive', 'cheerful',
        'positive', 'sunny', 'playful', 'victory', 'triumph', 'uplift', 'joyful',
    ],
    energetic: [
        'energetic', 'party', 'dance', 'workout', 'high energy', 'upbeat', 'club',
        'dj', 'remix', 'pump', 'power', 'bhangra', 'dhol',
    ],
    chill: [
        'chill', 'calm', 'acoustic', 'lofi', 'lo-fi', 'relaxing', 'peaceful', 'mellow',
        'late night', 'soft', 'easy listening', 'unplugged',
    ],
    relaxed: [
        'calm', 'chill', 'mellow', 'soft', 'easy listening', 'peaceful', 'relax',
        'soothing', 'serene', 'gentle', 'tranquil',
    ],
    romantic: [
        'romantic', 'love', 'lover', 'ishq', 'pyaar', 'prem', 'heartfelt', 'valentine',
        'romance', 'dil', 'mohabbat', 'aashiq',
    ],
    confident: [
        'confident', 'attitude', 'swag', 'bold', 'power', 'boss', 'fearless',
        'strong', 'fierce',
    ],
    motivated: [
        'motivational', 'inspiring', 'empowering', 'victory', 'determination', 'fight',
        'rise', 'achieve', 'champion', 'winner',
    ],
    calm: [
        'calm', 'peaceful', 'mellow', 'soft', 'soothing', 'serene', 'gentle',
        'tranquil', 'quiet',
    ],
};

const MOOD_NEGATIVE_KEYWORDS = {
    sad: [
        'party', 'celebration', 'dance', 'wedding', 'holi', 'happy', 'upbeat',
        'kids', 'comedy', 'shaadi', 'club', 'bhangra', 'high energy', 'workout',
        'dhol', 'festival', 'festive', 'masti',
    ],
    happy: [
        'heartbreak', 'sad', 'melancholy', 'crying', 'broken', 'dard', 'judaai',
        'lonely', 'sorrow', 'bewafa', 'rula', 'tanha', 'gham',
    ],
    energetic: [
        'sleep', 'meditation', 'ambient', 'white noise', 'mourning', 'heartbreak',
        'calm', 'peaceful', 'soothing',
    ],
    chill: [
        'party', 'festival', 'club', 'workout', 'high energy', 'bhangra', 'dhol',
        'dance', 'energetic', 'pump',
    ],
    relaxed: [
        'party', 'festival', 'club', 'workout', 'high energy', 'bhangra', 'dhol',
        'dance', 'energetic',
    ],
    romantic: [
        'party', 'workout', 'comedy', 'kids', 'devotional',
    ],
    confident: [
        'sad', 'melancholy', 'crying', 'heartbreak', 'meditation',
    ],
    motivated: [
        'sad', 'melancholy', 'crying', 'heartbreak', 'sleep', 'meditation',
    ],
    calm: [
        'party', 'festival', 'club', 'workout', 'high energy', 'bhangra', 'dhol',
        'dance', 'energetic',
    ],
};

const MOOD_INTENTS = {
    sad: ['sad', 'heartbreak', 'melancholy', 'emotional', 'breakup', 'heart touching'],
    happy: ['happy', 'feel good', 'uplifting', 'celebration', 'joyful', 'upbeat'],
    energetic: ['energetic', 'upbeat', 'dance', 'party', 'high energy', 'workout'],
    chill: ['chill', 'mellow', 'laid back', 'easy listening', 'soft pop'],
    relaxed: ['calm', 'chill', 'mellow', 'soft', 'easy listening'],
    romantic: ['romantic', 'love song', 'love', 'romance', 'heartfelt'],
    confident: ['confident', 'attitude', 'power', 'swag', 'bold'],
    motivated: ['motivational', 'inspiring', 'empowering', 'victory', 'determination'],
    calm: ['calm', 'soothing', 'peaceful', 'mellow', 'soft'],
};
const BROAD_MOOD_INTENTS = {
    sad: ['sad Bollywood songs', 'heartbreak Bollywood songs'],
    happy: ['happy Bollywood songs', 'feel good Bollywood songs', 'celebration Bollywood songs'],
    energetic: ['energetic Bollywood songs', 'dance Bollywood songs'],
    chill: ['chill Bollywood songs', 'mellow Bollywood songs'],
    relaxed: ['calm Bollywood songs', 'chill Bollywood songs'],
    romantic: ['romantic Bollywood songs', 'love Bollywood songs'],
    confident: ['confident Bollywood songs', 'attitude Bollywood songs'],
    motivated: ['motivational Bollywood songs', 'inspiring Bollywood songs'],
    calm: ['calm Bollywood songs', 'soothing Bollywood songs'],
};
const NEGATIVE = /\b(meditation|chakra|yoga|sleep|spa|healing|devotional|bhajan|mantra|chant|nature sounds?|white noise|sound effect|background music|instructional audio|karaoke)\b/i;
const GENERIC_CONTENT = /\b(theme|background|sound effect|loop|intro|outro|advert|jingle|karaoke|instrumental version)\b/i;
const MUSIC_EVIDENCE = /\b(song|songs|track|version|ost|soundtrack|film|movie|bollywood|album|singer|sung by|feat\.?|remix|title track|pop|dance|rock|folk|indie)\b/i;
const MOOD_EVIDENCE = {
    sad: /\b(heartbreak|broken|melancholy|breakup|cry|tears|lonely|dard|judai|bewafa|gham|rona|tanha|judaai|adhuri|rula|yaadein|alvida|tanhai|intezaar)\b/i,
    happy: /\b(upbeat|feel.?good|celebrat|joyful|party|dance|energetic|masti|khushi|festive|cheerful|positive|sunny|playful|victory|triumph)\b/i,
    energetic: /\b(energetic|dance|party|upbeat|power|workout|pump|high energy|dj|remix|bhangra|dhol)\b/i,
    chill: /\b(chill|mellow|laid.?back|easy listening|soft pop|unplugged|lofi|lo-fi)\b/i,
    relaxed: /\b(chill|mellow|soft|peaceful|relax|soothing|serene|gentle)\b/i,
    romantic: /\b(romantic|love|lover|ishq|pyaar|prem|heartfelt|valentine|mohabbat|dil)\b/i,
    confident: /\b(confident|attitude|swag|bold|power|boss|fearless|strong)\b/i,
    motivated: /\b(motiv\w*|inspir\w*|empower\w*|victory|determination|fight|rise)\b/i,
    calm: /\b(calm|peaceful|mellow|soft|soothing|serene|gentle|tranquil)\b/i,
};

const COLLECTION_LABEL = /\b(playlist|mixtape|collection|category|hits|songs? of|songs? for|ultimate|best of|top \d+|mix|themes?)\b/i;
const GENERIC_HAPPY_WORDS = /\b(happy|feel.?good|good|joy|fun|celebrat\w*|festival|wedding)\b/i;
const SONG_QUALITY_NEGATIVE = /\b(theme music|background music|background score|sound effects?|loop|intro|outro|jingle|karaoke|meditation|spa|chakra|sleep music|nature sounds?|healing music|generic ambience)\b/i;
const MOOD_SIGNAL_PATTERNS = {
    happy: /\b(upbeat|feel.?good|joy|joyful|uplift\w*|cheerful|positive|fun|dance|energetic|masti|khushi|playful|sunny|victory|triumph)\b/i,
    sad: MOOD_EVIDENCE.sad,
    energetic: MOOD_EVIDENCE.energetic,
    chill: MOOD_EVIDENCE.chill,
    relaxed: MOOD_EVIDENCE.relaxed,
    romantic: MOOD_EVIDENCE.romantic,
    confident: MOOD_EVIDENCE.confident,
    motivated: MOOD_EVIDENCE.motivated,
    calm: MOOD_EVIDENCE.calm,
};
const WEAK_HAPPY_SIGNALS = /\b(celebrat\w*|festival|wedding|party)\b/i;
const MOOD_CONTRADICTIONS = {
    happy: /\b(sad|heartbreak|broken|cry(?:ing)?|lonely|mourning|grief|dard|judai|bewafa|gham)\b/i,
    sad: /\b(party|celebrat\w*|festival|wedding|shaadi|club|bhangra|high.?energy|workout|dhol)\b/i,
    energetic: /\b(sleep|meditation|ambient|white noise|mourning|heartbreak)\b/i,
    chill: /\b(party|festival|club|workout|high.?energy|bhangra|dhol)\b/i,
    relaxed: /\b(party|festival|club|workout|high.?energy|bhangra|dhol)\b/i,
    calm: /\b(party|festival|club|workout|high.?energy|bhangra|dhol)\b/i,
};

const TRANSITION_WEIGHTS = {
    current: 0.25,
    desired: 0.7,
    bridge: 0.2,
    quality: 0.15,
    currentPenalty: 0.45,
};

const BRIDGE_TERMS = {
    sad: ['hopeful', 'warm', 'comforting', 'positive', 'uplifting', 'light'],
    angry: ['grounded', 'steady', 'relieved', 'soft', 'calm'],
    anxious: ['grounded', 'steady', 'relieved', 'peaceful', 'calm'],
    stressed: ['grounded', 'steady', 'relieved', 'motivated', 'calm'],
    energetic: ['focused', 'confident', 'warm', 'steady'],
    happy: ['warm', 'mellow', 'soft', 'reflective'],
    calm: ['hopeful', 'motivated', 'upbeat', 'energizing'],
    relaxed: ['hopeful', 'motivated', 'upbeat', 'energizing'],
};

const NON_INDIAN_LANGUAGES = new Set(['japanese', 'korean', 'german', 'spanish', 'french', 'chinese', 'mandarin', 'portuguese', 'russian', 'italian', 'swedish', 'dutch', 'arabic']);

function classifyContent(track) {
    const title = String(track.title || track.name || '').toLowerCase();
    const album = String(track._albumName || track.album?.name || '').toLowerCase();
    const collection = String(track._collectionName || '').toLowerCase();
    const artist = String(track.artist || '').toLowerCase();
    const tags = (Array.isArray(track.tags) ? track.tags : [track.tags]).filter(Boolean).join(' ').toLowerCase();
    const text = `${title} ${album} ${collection} ${artist} ${tags}`;

    if (/\b(sound effects?|sfx|white noise|nature sounds?)\b/.test(text)) return 'SOUND_EFFECT';
    if (/\b(meditation|chakra|yoga|sleep music|healing|spa|mindfulness)\b/.test(text)) return 'MEDITATION';
    if (/\b(devotional\w*|bhajan\w*|mantra\w*|chant\w*|aarti\w*|prayer\w*|kirtan\w*|shloka\w*)\b/.test(text)) return 'DEVOTIONAL';
    if (/\b(background music|background score|ambient background|generic ambience)\b/.test(text)) return 'BACKGROUND';
    if (/\bbirthday\b/.test(text)) return 'EVENT';
    if (/\b(wedding|shaadi|mehndi)\b/.test(text) && /\b(background|finale|score|instrumental|entrance|song)\b/.test(text)) return 'EVENT';
    if (/\b(theme music|theme song|themes?|jingle|intro|outro)\b/.test(text)) return 'THEME';
    if (/\b(soundtrack|ost|film score)\b/.test(text)) return 'SOUNDTRACK';
    if (/\b(wedding|shaadi|mehndi)\b/.test(text)) return 'WEDDING';
    if (/\b(holi|diwali|navratri|festival|festive)\b/.test(text)) return 'FESTIVAL';
    if (/\b(instrumental|acoustic|flute|piano)\b/.test(text)) return 'INSTRUMENTAL';
    if (track._raw?.type === 'song' || track.permalink || track.streamUrl) return 'SONG';
    return 'UNKNOWN';
}

function resolveLanguageAndRegion(track) {
    const moreInfo = track.more_info || track.moreInfo || {};
    const artistRecords = track.artists?.primary || track.artists || [];
    const artists = Array.isArray(artistRecords) ? artistRecords : [];
    const providerLanguage = track.language || moreInfo.language || null;
    const albumLanguage = track.album?.language || moreInfo.album_language || moreInfo.albumLanguage || null;
    const providerLanguageText = [providerLanguage, ...artists.map((artist) => artist?.language)]
        .filter(Boolean).join(' ').toLowerCase();
    const albumLanguageText = [albumLanguage].filter(Boolean).join(' ').toLowerCase();
    const languageText = [providerLanguageText, albumLanguageText]
        .filter(Boolean).join(' ').toLowerCase();
    const normalizedLanguage = languageText.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const providerNormalizedLanguage = normalizeLanguage(providerLanguage);
    const albumNormalizedLanguage = normalizeLanguage(albumLanguage);
    const indianLanguage = providerNormalizedLanguage !== 'Unknown'
        ? providerNormalizedLanguage.toLowerCase()
        : albumNormalizedLanguage !== 'Unknown' ? albumNormalizedLanguage.toLowerCase() : null;
    const scriptText = [track.name, track.title, track.subtitle, ...artists.map((artist) => artist?.name)].filter(Boolean).join(' ');
    const scriptLanguage = /[\u0B80-\u0BFF]/.test(scriptText) ? 'Tamil'
        : /[\u0C00-\u0C7F]/.test(scriptText) ? 'Telugu'
            : /[\u0C80-\u0CFF]/.test(scriptText) ? 'Kannada'
                : /[\u0D00-\u0D7F]/.test(scriptText) ? 'Malayalam'
                    : /[\u0A00-\u0A7F]/.test(scriptText) ? 'Punjabi'
                        : /[\u0A80-\u0AFF]/.test(scriptText) ? 'Gujarati'
                            : /[\u0B00-\u0B7F]/.test(scriptText) ? 'Odia'
                                : /[\u0980-\u09FF]/.test(scriptText) ? 'Bengali'
                                    : /[\u0900-\u097F]/.test(scriptText) ? 'Hindi' : null;
    const originText = [track.country, track.countryCode, track.origin, track.artistCountry, track.album?.country, moreInfo.country,
        ...artists.flatMap((artist) => [artist?.country, artist?.countryCode, artist?.origin, artist?.nationality])]
        .filter(Boolean).join(' ').toLowerCase();
    const explicitIndia = /\b(india|indian|in)\b/i.test(originText);
    const explicitNonIndia = /\b(japan|germany|german|korea|united states|usa|canada|france|spain|sweden|netherlands|uk|united kingdom)\b/i.test(originText);
    const nonIndianProviderLanguage = normalizedLanguage.split(' ').find((word) => NON_INDIAN_LANGUAGES.has(word));
    const language = indianLanguage ? `${indianLanguage[0].toUpperCase()}${indianLanguage.slice(1)}`
        : scriptLanguage || track.language || moreInfo.language || track.album?.language || null;
    const indianEvidence = Boolean(indianLanguage || scriptLanguage || explicitIndia);
    const regionConfidence = explicitIndia ? 0.98
        : nonIndianProviderLanguage || (explicitNonIndia && !indianLanguage && !scriptLanguage) ? 0.03
            : indianEvidence ? 0.95 : 0.35;
    const detectedLanguage = normalizeLanguage(language);
    const languageConfidence = providerNormalizedLanguage !== 'Unknown' ? 0.98
        : scriptLanguage ? 0.92
            : albumNormalizedLanguage !== 'Unknown' ? 0.65
                : 0.2;
    return {
        language: detectedLanguage,
        providerLanguage: providerNormalizedLanguage,
        albumLanguage: albumNormalizedLanguage,
        detectedLanguage,
        languageConfidence,
        regionConfidence,
        regionReason: indianEvidence ? 'Indian language/origin metadata' : explicitNonIndia || nonIndianProviderLanguage ? 'explicit non-Indian metadata' : 'region metadata uncertain',
    };
}

function normalizeTrack(track) {
    const moreInfo = track.more_info || track.moreInfo || {};
    const downloads = track.downloadUrl || moreInfo.downloadUrl || [];
    let streamUrl = (Array.isArray(downloads) ? downloads : Object.values(downloads))
        .slice().sort((a, b) => Number.parseInt(b.quality, 10) - Number.parseInt(a.quality, 10)).find((item) => item?.url)?.url;
    if (!streamUrl) {
        const encrypted = moreInfo.encrypted_media_url || moreInfo.encrypted_media_path || moreInfo.media_url;
        if (encrypted) {
            try {
                const decipher = forge.cipher.createDecipher('DES-ECB', forge.util.createBuffer('38346591'));
                decipher.start();
                decipher.update(forge.util.createBuffer(forge.util.decode64(encrypted)));
                if (decipher.finish()) streamUrl = decipher.output.getBytes().replace(/\0+$/, '');
            } catch (_error) { /* A malformed/unsupported provider URL is not a playable result. */ }
        }
    }
    if (!track.id || !streamUrl) return null;
    const artistList = track.artists?.primary || track.artists || [];
    const artists = Array.isArray(artistList) ? artistList.map((artist) => typeof artist === 'string' ? artist : artist.name).filter(Boolean) : [];
    const images = Array.isArray(track.image) ? track.image : [];
    const artwork = images.slice().sort((a, b) => Number.parseInt(b.quality, 10) - Number.parseInt(a.quality, 10)).find((item) => item.url)?.url
        || (typeof track.image === 'string' ? track.image : null) || track.imageUrl || null;
    const rawAlbumName = typeof track.album === 'string' ? track.album : track.album?.name || moreInfo.album;
    const providerCollection = track.collection?.name || track.collection || moreInfo.collection || moreInfo.playlist
        || moreInfo.category || track.playlist?.name || track.category?.name || null;
    const albumLooksLikeCollection = typeof rawAlbumName === 'string'
        && (COLLECTION_LABEL.test(rawAlbumName) || /\b(feel.?good|happy|upbeat|celebration)\b/i.test(rawAlbumName));
    const albumName = albumLooksLikeCollection ? null : rawAlbumName;
    const collectionName = providerCollection || (albumLooksLikeCollection ? rawAlbumName : null);
    const genre = track.genre || moreInfo.genre || track.primary_genre || null;
    const regionMetadata = resolveLanguageAndRegion(track);
    const normalized = { id: `indian-${track.id}`, title: track.name || track.title || '', artist: artists.join(', ') || track.subtitle || 'Unknown artist', artwork,
        duration: Number(track.duration || moreInfo.duration) || 0, streamUrl, source: 'jiosaavn', region: regionMetadata.regionConfidence >= 0.8 ? 'Indian' : null, language: regionMetadata.detectedLanguage,
        genre: track.genre || genre, tags: Array.isArray(track.tags || moreInfo.tags) ? (track.tags || moreInfo.tags) : [], mood: null, permalink: track.url || track.perma_url || null,
        regionConfidence: regionMetadata.regionConfidence, languageConfidence: regionMetadata.languageConfidence, regionReason: regionMetadata.regionReason,
        _providerLanguage: regionMetadata.providerLanguage, _albumLanguage: regionMetadata.albumLanguage, _detectedLanguage: regionMetadata.detectedLanguage,
        _albumName: albumName || null, _collectionName: typeof collectionName === 'string' ? collectionName : null,
        _artistMetadata: artists.join(', ') || track.subtitle || null,
        _tempo: Number(track.tempo || moreInfo.tempo) || null,
        _instrumental: track.instrumental ?? moreInfo.instrumental ?? null,
        _popularity: Number(track.playCount || track.play_count || moreInfo.play_count) || 0, _raw: track };
    normalized._contentType = classifyContent(normalized);
    return normalized;
}

function intentsFor(mood, language) {
    const aliases = { relaxed: 'calm', calm: 'calm', funky: 'energetic' };
    const resolvedMood = aliases[mood] || mood;
    const intents = (MOOD_INTENTS[resolvedMood] || ['popular', 'new']).slice(0, 4);
    const langs = language && language !== 'All' ? [language] : LANGUAGES;
    const languageQueries = langs.flatMap((lang) => intents.map((intent) => `${intent} ${lang} songs`));
    return language === 'All' ? [...languageQueries, ...(BROAD_MOOD_INTENTS[resolvedMood] || [])] : languageQueries;
}

function logIndianProviderDebug(payload) {
    console.info('=== INDIAN PROVIDER DEBUG ===');
    console.info(`provider: ${PROVIDER_CLIENT}`);
    console.info(`endpoint: ${SEARCH_URL}`);
    console.info(`searchQueries: ${JSON.stringify(payload.searchQueries || [])}`);
    console.info(`rawProviderResults: ${JSON.stringify(payload.rawProviderResults || [])}`);
    console.info(`rawCount: ${payload.rawCount ?? 0}`);
    console.info(`afterNormalization: ${payload.afterNormalization ?? 0}`);
    console.info(`afterRegionFilter: ${payload.afterRegionFilter ?? 0}`);
    console.info(`afterLanguageScoring: ${payload.afterLanguageScoring ?? 0}`);
    console.info(`afterQualityFilter: ${payload.afterQualityFilter ?? 0}`);
    console.info(`moodCandidates: ${payload.moodCandidates ?? 0}`);
    console.info(`finalCandidates: ${payload.finalCandidates ?? 0}`);
    console.info(`relaxationStage: ${payload.relaxationStage ?? 'none'}`);
    if (payload.candidateDiagnostics) console.info(`candidateDiagnostics: ${JSON.stringify(payload.candidateDiagnostics)}`);
    console.info(`providerRequestSucceeded: ${payload.providerRequestSucceeded ?? false}`);
    console.info(`providerReturnedCandidates: ${payload.providerReturnedCandidates ?? false}`);
    console.info(`providerStatus: ${payload.providerStatus ?? 'UNKNOWN'}`);
    if (payload.searchFailures) console.info(`searchFailures: ${payload.searchFailures}`);
    console.info('=============================');
}

function logLanguageFilterDebug(payload) {
    console.info('=== LANGUAGE FILTER DEBUG ===');
    console.info(`requestedLanguage: ${payload.requestedLanguage}`);
    console.info(`providerCandidateCount: ${payload.providerCandidateCount}`);
    console.info(`languageCountsBeforeFilter: ${JSON.stringify(payload.languageCountsBeforeFilter)}`);
    console.info(`acceptedLanguage: ${payload.acceptedLanguage}`);
    console.info(`acceptedCount: ${payload.acceptedCount}`);
    console.info(`rejectedCount: ${payload.rejectedCount}`);
    console.info(`rejectedLanguages: ${JSON.stringify(payload.rejectedLanguages)}`);
    console.info(`moodCandidates: ${payload.moodCandidates}`);
    console.info(`qualityCandidates: ${payload.qualityCandidates}`);
    console.info(`finalCandidates: ${payload.finalCandidates}`);
    console.info(`finalLanguageDistribution: ${JSON.stringify(payload.finalLanguageDistribution || {})}`);
    console.info('============================');
}

function logMoodTransitionDebug(payload) {
    console.info('=== MOOD TRANSITION DEBUG ===');
    console.info(`currentMood: ${payload.currentMood}`);
    console.info(`desiredMood: ${payload.desiredMood}`);
    console.info(`isTransition: ${payload.isTransition}`);
    console.info(`transition: ${payload.currentMood} -> ${payload.desiredMood}`);
    console.info(`currentMoodWeight: ${TRANSITION_WEIGHTS.current}`);
    console.info(`desiredMoodWeight: ${TRANSITION_WEIGHTS.desired}`);
    console.info(`bridgeWeight: ${TRANSITION_WEIGHTS.bridge}`);
    console.info(`candidateExamples: ${JSON.stringify(payload.candidateExamples)}`);
    console.info(`selectedTracks: ${JSON.stringify(payload.selectedTracks)}`);
    console.info(`averageCurrentMoodScore: ${payload.averageCurrentMoodScore}`);
    console.info(`averageDesiredMoodScore: ${payload.averageDesiredMoodScore}`);
    console.info(`averageTransitionScore: ${payload.averageTransitionScore}`);
    console.info('==============================');
}

async function fetchRawSearchResults(query, limit = 12, page = 1) {
    const response = await axios.get(SEARCH_URL, {
        timeout: 9000,
        params: {
            __call: 'search.getResults', _format: 'json', _marker: '0', api_version: 4, ctx: 'web6dot0', cc: 'in', p: page, q: query, n: limit,
        },
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    });
    const payload = response.data;
    const list = payload?.results || payload?.data?.results || [];
    return { list, query, limit, page };
}

async function searchTracks(query, limit = 12) {
    const { list } = await fetchRawSearchResults(query, limit);
    return list.map(normalizeTrack).filter(Boolean);
}

async function debugSearch(query, limit = 20) {
    const { list, page } = await fetchRawSearchResults(query, limit);
    const candidates = list.map(normalizeTrack).filter(Boolean);
    return {
        provider: PROVIDER_CLIENT,
        endpoint: SEARCH_URL,
        query,
        page,
        limit,
        rawCount: list.length,
        normalizedCount: candidates.length,
        candidates: candidates.slice(0, Math.min(limit, 15)).map(({ id, title, artist, language, source, streamUrl, regionConfidence }) => ({
            id, title, artist, language, source, regionConfidence, hasStreamUrl: Boolean(streamUrl),
        })),
    };
}

function moodDiscoveryQueries(mood) {
    const aliases = { relaxed: 'calm', calm: 'calm', funky: 'energetic' };
    const resolvedMood = aliases[mood] || mood;
    return [...new Set([
        ...(BROAD_MOOD_INTENTS[resolvedMood] || []),
        ...(MOOD_INTENTS[resolvedMood] || []).slice(0, 3).map((intent) => `${intent} Bollywood songs`),
    ])];
}

function broadIndianRetrievalQueries(languagePreference) {
    const lang = languagePreference && languagePreference !== 'All' ? languagePreference : 'Hindi';
    return [
        'Bollywood',
        'Bollywood songs',
        `${lang} songs`,
        'popular Indian songs',
        'latest Bollywood songs',
        'Arijit Singh',
        'Shreya Ghoshal',
    ];
}

// ── Build Mood-Specific Search Query Plan ──
// Uses targeted Hindi/Punjabi/regional queries instead of generic single-word searches.
function buildRetrievalQueryPlan(currentMood, desiredMood, languagePreference) {
    const aliases = { relaxed: 'calm', calm: 'calm', funky: 'energetic' };
    const resolvedCurrent = aliases[currentMood] || currentMood;
    const resolvedDesired = aliases[desiredMood] || desiredMood;
    const specificLanguage = languagePreference && !['All', 'Indian', 'Mixed', 'DefaultIndianMix'].includes(languagePreference);

    // Build mood-specific queries
    const moodQueries = MOOD_SEARCH_QUERIES[resolvedDesired] || MOOD_SEARCH_QUERIES.happy;
    const currentMoodQueries = resolvedCurrent !== resolvedDesired
        ? (MOOD_SEARCH_QUERIES[resolvedCurrent] || MOOD_SEARCH_QUERIES.happy)
        : null;

    const primary = new Map();

    if (specificLanguage) {
        // User selected a specific language
        const intents = (MOOD_INTENTS[resolvedDesired] || ['popular']).slice(0, 4);
        intents.forEach((intent) => {
            const query = `${intent} ${languagePreference} songs`;
            primary.set(query, [desiredMood]);
        });
        if (currentMoodQueries) {
            const currentIntents = (MOOD_INTENTS[resolvedCurrent] || []).slice(0, 2);
            currentIntents.forEach((intent) => {
                const query = `${intent} ${languagePreference} songs`;
                primary.set(query, [currentMood]);
            });
        }
    } else {
        // Default Indian mix — use mood-specific targeted queries
        // Add Hindi queries (primary)
        const hindiQueries = moodQueries.hindi || [];
        hindiQueries.slice(0, 8).forEach((query) => primary.set(query, [desiredMood]));

        // Add Punjabi queries (secondary)
        const punjabiQueries = moodQueries.punjabi || [];
        punjabiQueries.slice(0, 3).forEach((query) => primary.set(query, [desiredMood]));

        // Add regional queries (limited)
        const regionalQueries = moodQueries.regional || [];
        regionalQueries.slice(0, 2).forEach((query) => primary.set(query, [desiredMood]));

        // Add generic Bollywood queries
        const genericQueries = moodQueries.generic || [];
        genericQueries.forEach((query) => primary.set(query, [desiredMood]));

        // For transitions, add current mood queries too
        if (currentMoodQueries) {
            const currentHindi = currentMoodQueries.hindi || [];
            currentHindi.slice(0, 4).forEach((query) => primary.set(query, [currentMood]));
            const currentPunjabi = currentMoodQueries.punjabi || [];
            currentPunjabi.slice(0, 2).forEach((query) => primary.set(query, [currentMood]));
        }
    }

    const secondary = moodDiscoveryQueries(desiredMood).map((query) => (
        specificLanguage ? `${query} ${languagePreference} songs` : query
    ));
    const bridgeTerms = currentMood !== desiredMood ? getBridgeTerms(currentMood, desiredMood) : [];
    const bridgeQueries = bridgeTerms.map((term) => (
        specificLanguage ? `${term} ${languagePreference} songs` : `${term} Indian songs`
    ));
    const tertiary = broadIndianRetrievalQueries(languagePreference);
    return [
        { label: 'primary', queries: [...primary.keys()], queryMood: primary },
        { label: 'mood-discovery', queries: secondary, queryMood: new Map(secondary.map((query) => [query, [desiredMood]])) },
        { label: 'transition-bridge', queries: bridgeQueries, queryMood: new Map(bridgeQueries.map((query) => [query, [desiredMood]])), queryBridge: new Map(bridgeQueries.map((query, index) => [query, [bridgeTerms[index]]])) },
        { label: 'broad-indian', queries: tertiary, queryMood: new Map(tertiary.map((query) => [query, [desiredMood]])) },
    ];
}

// ── Quality Filter ──
// Only reject clearly non-music or garbage content. Do NOT reject legitimate songs
// with incomplete metadata.
function minimalPoolRejectReason(track) {
    const regionConfidence = Number(track.regionConfidence) || 0;
    if (regionConfidence < 0.15) return 'regionConfidence too low / non-Indian language or origin';
    const fullText = [track.title, track.artist, track.genre, track._albumName, track._collectionName, ...(track.tags || [])].filter(Boolean).join(' ');
    if (['BACKGROUND', 'MEDITATION', 'DEVOTIONAL', 'SOUND_EFFECT'].includes(track._contentType)) {
        return `${track._contentType.toLowerCase()} or non-song content`;
    }
    if (NEGATIVE.test(fullText) || SONG_QUALITY_NEGATIVE.test(fullText)) {
        return 'generic, background, or non-song content';
    }
    if (!track.streamUrl || Number(track.duration) < 60) return 'weak evidence that candidate is a playable song';
    return null;
}

function languagePreferenceBoost(track, languagePreference) {
    if (!languagePreference || languagePreference === 'All') return 8;
    if (track.language && track.language.toLowerCase() === languagePreference.toLowerCase()) return 30;
    if (track.language) return 12;
    return 6;
}

// ── Language Weight Boost for Default Indian Mix ──
// Gives higher scores to Hindi/Punjabi tracks when using default Indian language profile.
function indianLanguageWeightBoost(track, languagePreference) {
    // Only apply weighting for default Indian mix (not specific language selection)
    if (languagePreference && !['All', 'Indian', 'Mixed', 'DefaultIndianMix'].includes(languagePreference)) {
        return 0; // No boost for specific language selection
    }
    const lang = String(track.language || '').toLowerCase();
    const weight = INDIAN_LANGUAGE_WEIGHTS[lang];
    if (!weight) return 0;
    // Convert weight to a score boost (Hindi=50 → +25, Punjabi=20 → +10, etc.)
    return Math.round(weight * 0.5);
}

// ── Mood Score Calculator ──
// Calculates how well a track matches a given mood using keyword matching.
// This is a SCORING function — it produces a numeric score for ranking.
// It does NOT reject songs.
function calculateMoodScore(song, mood) {
    const pattern = MOOD_SIGNAL_PATTERNS[mood] || MOOD_EVIDENCE[mood];
    const title = String(song.title || '');
    const artist = String(song._artistMetadata || song.artist || '');
    const album = String(song._albumName || '');
    const collection = String(song._collectionName || '');
    const tags = (Array.isArray(song.tags) ? song.tags : [song.tags]).filter(Boolean).join(' ');
    const genre = String(song.genre || '');
    const weakTitleSignal = mood === 'happy' && WEAK_HAPPY_SIGNALS.test(title);
    const titleHit = pattern?.test(title) || weakTitleSignal;
    const titleGeneric = mood === 'happy' && GENERIC_HAPPY_WORDS.test(title);
    const songTitleMoodScore = titleHit ? (titleGeneric || weakTitleSignal ? 3 : 8) : 0;
    const artistMoodScore = pattern?.test(artist) ? 4 : 0;
    const albumMoodScore = pattern?.test(album) ? 5 : 0;
    const collectionMoodScore = pattern?.test(collection) ? 3 : 0;
    const tagMoodScore = pattern?.test(tags) ? 28 : mood === 'happy' && WEAK_HAPPY_SIGNALS.test(tags) ? 4 : 0;
    const genreMoodScore = pattern?.test(genre) ? 18 : mood === 'happy' && WEAK_HAPPY_SIGNALS.test(genre) ? 3 : 0;
    const queryMoodScore = song._matchedMoods?.includes(mood) ? 6 : 0;
    const declaredMoodScore = song.source === 'moodify-library' && song.mood === mood ? 22 : 0;
    const tempo = Number(song._tempo);
    const tempoMoodScore = Number.isFinite(tempo) && tempo > 0
        ? ((mood === 'happy' || mood === 'energetic') && tempo >= 105 ? 8 : (mood === 'calm' || mood === 'chill') && tempo <= 90 ? 7 : 0)
        : 0;

    // ── Extended keyword matching using MOOD_POSITIVE_KEYWORDS ──
    const positiveKeywords = MOOD_POSITIVE_KEYWORDS[mood] || [];
    const fullText = [title, artist, album, collection, tags, genre].join(' ').toLowerCase();
    let extendedKeywordScore = 0;
    const matchedKeywords = [];
    for (const keyword of positiveKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            extendedKeywordScore += 4;
            matchedKeywords.push(keyword);
        }
    }
    // Cap extended keyword bonus at 20
    extendedKeywordScore = Math.min(20, extendedKeywordScore);

    // ── Search query source bonus ──
    // If this track was returned by a mood-specific search query, it gets a baseline relevance bonus.
    const searchSourceBonus = song._matchedMoods?.length ? Math.min(15, song._matchedMoods.length * 5) : 0;

    const evidenceText = [title, artist, album, collection, tags, genre].join(' ');
    const moodSignalCount = new Set([...evidenceText.matchAll(new RegExp(pattern?.source || '(?!)', 'gi'))]
        .map((match) => match[0].toLowerCase())).size + (declaredMoodScore > 0 ? 2 : 0) + (tempoMoodScore > 0 ? 1 : 0) + matchedKeywords.length;
    const independentEvidence = declaredMoodScore + tagMoodScore + genreMoodScore + (titleHit && !titleGeneric && !weakTitleSignal ? songTitleMoodScore : 0)
        + (artistMoodScore ? 3 : 0) + tempoMoodScore + extendedKeywordScore + searchSourceBonus;
    const collectionDominates = (collectionMoodScore > 0 || albumMoodScore > 0)
        && independentEvidence < 8;
    const raw = songTitleMoodScore + artistMoodScore + albumMoodScore + collectionMoodScore
        + tagMoodScore + genreMoodScore + queryMoodScore + declaredMoodScore + tempoMoodScore
        + extendedKeywordScore + searchSourceBonus;
    const contradictionText = [title, artist, album, collection, tags, genre].join(' ');
    const contradictionPattern = MOOD_CONTRADICTIONS[mood];
    const negativeScore = contradictionPattern?.test(contradictionText) ? 30 : 0;

    // ── Check negative keywords ──
    const negativeKeywords = MOOD_NEGATIVE_KEYWORDS[mood] || [];
    let negativeKeywordPenalty = 0;
    for (const keyword of negativeKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            negativeKeywordPenalty += 5;
        }
    }
    negativeKeywordPenalty = Math.min(25, negativeKeywordPenalty);
    const totalNegative = negativeScore + negativeKeywordPenalty;

    return {
        score: Math.max(0, Math.min(100, Math.round(raw - totalNegative))),
        negativeScore: totalNegative,
        songTitleMoodScore, artistMoodScore, albumMoodScore, collectionMoodScore,
        tagMoodScore, genreMoodScore, queryMoodScore, tempoMoodScore,
        declaredMoodScore, extendedKeywordScore, searchSourceBonus,
        independentEvidence, collectionDominates, moodSignalCount,
        matchedKeywords,
        reasons: [
            titleHit && !titleGeneric && !weakTitleSignal ? 'song title has mood semantics' : null,
            tagMoodScore ? 'provider tags support the mood' : null,
            genreMoodScore ? 'genre metadata supports the mood' : null,
            tempoMoodScore ? 'tempo supports the mood' : null,
            extendedKeywordScore > 0 ? `extended keyword matches: ${matchedKeywords.join(', ')}` : null,
            searchSourceBonus > 0 ? 'returned by mood-specific search query' : null,
            collectionMoodScore || albumMoodScore ? 'album or collection is weak supporting evidence' : null,
        ].filter(Boolean),
    };
}

function getBridgeTerms(currentMood, desiredMood) {
    const currentTerms = BRIDGE_TERMS[currentMood] || ['hopeful', 'warm', 'uplifting', 'positive'];
    const desiredTerms = MOOD_INTENTS[desiredMood] || [];
    return [...new Set([...currentTerms, ...desiredTerms.slice(0, 2)])];
}

function calculateBridgeScore(song, currentMood, desiredMood) {
    const terms = getBridgeTerms(currentMood, desiredMood);
    const text = [song.title, song._artistMetadata || song.artist, song.genre, song._albumName, song._collectionName,
        ...(Array.isArray(song.tags) ? song.tags : [song.tags])].filter(Boolean).join(' ').toLowerCase();
    const directMatches = terms.filter((term) => text.includes(term.toLowerCase())).length;
    const queryMatches = (song._matchedBridges || []).length;
    return Math.min(100, directMatches * 18 + queryMatches * 12);
}

function calculateTransitionScore(song, currentMood, desiredMood, qualityScore) {
    const isTransition = currentMood !== desiredMood;
    const desiredMoodBreakdown = calculateMoodScore(song, desiredMood);
    const currentMoodBreakdown = calculateMoodScore(song, currentMood);
    const bridgeScore = isTransition ? calculateBridgeScore(song, currentMood, desiredMood) : 0;
    const currentMoodPenalty = isTransition
        ? Math.max(0, currentMoodBreakdown.score - desiredMoodBreakdown.score) * TRANSITION_WEIGHTS.currentPenalty
            + (currentMoodBreakdown.score >= 20 ? 8 : 0)
        : 0;
    const transitionScore = isTransition
        ? desiredMoodBreakdown.score * TRANSITION_WEIGHTS.desired
            + currentMoodBreakdown.score * TRANSITION_WEIGHTS.current
            + bridgeScore * TRANSITION_WEIGHTS.bridge
            + qualityScore * TRANSITION_WEIGHTS.quality
            - currentMoodPenalty
        : desiredMoodBreakdown.score * 0.55 + qualityScore * 0.25 + bridgeScore * 0.1;

    return {
        isTransition,
        currentMoodScore: currentMoodBreakdown.score,
        desiredMoodScore: desiredMoodBreakdown.score,
        bridgeScore,
        currentMoodPenalty,
        transitionScore,
        currentMoodBreakdown,
        desiredMoodBreakdown,
    };
}

// ── Score Track ──
// IMPORTANT CHANGE: This function now SCORES tracks for ranking.
// It does NOT hard-reject tracks for insufficient mood evidence.
// Only hard-reject when there is strong contradictory evidence or clearly non-music content.
function scoreTrack(track, currentMood, desiredMood, language) {
    const regionConfidence = Number(track.regionConfidence) || 0.2;
    const languageConfidence = Number(track.languageConfidence) || 0.2;
    const regionScore = regionConfidence * 100;
    const languageScore = languageConfidence * 100;
    const desiredMoodBreakdown = calculateMoodScore(track, desiredMood);
    const currentMoodBreakdown = desiredMood !== currentMood ? calculateMoodScore(track, currentMood) : null;
    const chosenMood = currentMoodBreakdown && currentMoodBreakdown.score > desiredMoodBreakdown.score
        ? currentMoodBreakdown : desiredMoodBreakdown;
    const moodScore = chosenMood.score;
    const fullText = [track.title, track.artist, track.genre, track._albumName, track._collectionName, ...(track.tags || [])].filter(Boolean).join(' ');
    const genreScore = /\b(bollywood|film|movie|soundtrack|pop|hip.?hop|rock|indie|folk|r&b|dance|classical)\b/i.test(String(track.genre || '')) ? 75 : 45;
    const durationScore = track.duration >= 150 && track.duration <= 480 ? 70 : track.duration >= 90 && track.duration <= 600 ? 50 : 15;
    const popularityScore = Math.min(100, Math.log10((track._popularity || 0) + 1) * 22);
    const qualityScore = Math.min(100, durationScore * 0.55 + popularityScore * 0.25
        + (track.artwork ? 12 : 0) + (track.artist && track.artist !== 'Unknown artist' ? 8 : 0));
    const hasSongMetadata = Boolean(track._raw?.type === 'song' || track.permalink || track.streamUrl);
    const negative = NEGATIVE.test(fullText) || SONG_QUALITY_NEGATIVE.test(fullText) || track._instrumental === true;
    const genericContent = GENERIC_CONTENT.test(fullText);
    const moodContradiction = chosenMood.negativeScore || 0;
    const negativePenalty = (negative ? 45 : 0) + moodContradiction;
    const languageWeightBoost = indianLanguageWeightBoost(track, language);
    const relevanceScore = moodScore * 0.45 + regionScore * 0.10 + languageScore * 0.08 + genreScore * 0.05
        + qualityScore * 0.14 + languageWeightBoost * 0.08 + (hasSongMetadata ? 5 : 0) - negativePenalty;

    // ── HARD REJECTION ONLY for clearly bad content ──
    // Do NOT reject songs just because they lack mood metadata.
    let reason = regionConfidence < 0.15 ? 'clearly non-Indian language/origin metadata'
        : genericContent || negative ? 'generic, ambient, instrumental, or non-song content'
            : moodContradiction >= 24 ? 'strong signals contradict the requested mood'
                : qualityScore < 32 || !hasSongMetadata ? 'weak evidence that candidate is a playable song'
                    : null;

    // Language mismatch is only a hard rejection if a specific language was requested
    if (!reason && language && !['All', 'Mixed', 'DefaultIndianMix', 'Indian'].includes(language) && track.language && track.language !== language) {
        reason = 'language metadata does not match request';
    }

    return { score: relevanceScore, reason, regionConfidence, languageConfidence, moodScore, qualityScore, relevanceScore,
        moodBreakdown: chosenMood, desiredMoodBreakdown, languageWeightBoost, components: { regionScore, languageScore, genreScore,
            qualityScore, negativePenalty, collectionDominates: chosenMood.collectionDominates, independentEvidence: chosenMood.independentEvidence } };
}

function rankTrackForPool(track, currentMood, desiredMood, languagePreference) {
    const desiredMoodBreakdown = calculateMoodScore(track, desiredMood);
    const currentMoodBreakdown = desiredMood !== currentMood ? calculateMoodScore(track, currentMood) : null;
    const regionConfidence = Number(track.regionConfidence) || 0.2;
    const durationScore = track.duration >= 150 && track.duration <= 480 ? 70 : track.duration >= 90 && track.duration <= 600 ? 50 : 25;
    const popularityScore = Math.min(100, Math.log10((track._popularity || 0) + 1) * 22);
    const qualityScore = Math.min(100, durationScore * 0.55 + popularityScore * 0.25
        + (track.artwork ? 12 : 0) + (track.artist && track.artist !== 'Unknown artist' ? 8 : 0));
    const languageBoost = languagePreferenceBoost(track, languagePreference);
    const languageWeightBoost = indianLanguageWeightBoost(track, languagePreference);
    const transition = calculateTransitionScore(track, currentMood, desiredMood, qualityScore);
    const chosenMood = transition.isTransition && transition.currentMoodScore > transition.desiredMoodScore
        ? transition.currentMoodBreakdown : transition.desiredMoodBreakdown;
    const genericTitle = chosenMood.collectionDominates;
    const genericPenalty = genericTitle ? 15 : 0; // Reduced from 30 — soft penalty only
    const collectionPenalty = chosenMood.collectionDominates ? 10 : 0; // Reduced from 22
    const currentPhaseScore = transition.isTransition && transition.currentMoodScore > transition.desiredMoodScore
        ? transition.currentMoodScore * 0.6 + qualityScore * 0.15 + regionConfidence * 20 + languageBoost + languageWeightBoost
        : transition.transitionScore + regionConfidence * 100 * 0.2 + languageBoost + languageWeightBoost;
    const poolScore = currentPhaseScore - genericPenalty - collectionPenalty;
    return {
        score: poolScore,
        moodScore: chosenMood.score,
        transitionScore: transition.transitionScore,
        currentMoodScore: transition.currentMoodScore,
        desiredMoodScore: transition.desiredMoodScore,
        bridgeScore: transition.bridgeScore,
        currentMoodPenalty: transition.currentMoodPenalty,
        isTransition: transition.isTransition,
        qualityScore,
        regionConfidence,
        languageBoost,
        languageWeightBoost,
        moodBreakdown: chosenMood,
        genericPenalty,
        collectionPenalty,
        relevanceScore: poolScore,
    };
}

function dedupe(tracks) {
    const seen = new Set();
    return tracks.filter((track) => {
        const normalizedTitle = track.title.toLowerCase().replace(/\b(remaster(ed)?|remix|version|lyrics?|audio|video)\b/g, '').replace(/[^\p{L}\p{N}]/gu, '');
        const key = `${normalizedTitle}|${track.artist.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}`;
        if (seen.has(track.id) || seen.has(key)) return false;
        seen.add(track.id); seen.add(key); return true;
    });
}

async function mapConcurrentSettled(values, concurrency, callback) {
    const results = new Array(values.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
        while (next < values.length) {
            const index = next++;
            try { results[index] = { status: 'fulfilled', value: await callback(values[index]) }; }
            catch (reason) { results[index] = { status: 'rejected', reason }; }
        }
    }));
    return results;
}

// ── Language-Balanced Selection ──
// Ensures playlist follows the Indian language weighting profile.
function selectWithLanguageBalance(rankedItems, count, languagePreference) {
    const isDefaultIndianMix = !languagePreference || ['All', 'Indian', 'Mixed', 'DefaultIndianMix'].includes(languagePreference);
    if (!isDefaultIndianMix || count <= 0 || !rankedItems.length) {
        return rankedItems.slice(0, count);
    }

    // Target distribution for an 8-track playlist:
    // 4-5 Hindi, 1-2 Punjabi, 1-2 regional
    const targetDistribution = {
        hindi: { min: Math.ceil(count * 0.5), max: Math.ceil(count * 0.65) },
        punjabi: { min: Math.floor(count * 0.12), max: Math.ceil(count * 0.25) },
        _regional: { min: Math.floor(count * 0.12), max: Math.ceil(count * 0.25) },
    };

    const selected = [];
    const usedIds = new Set();

    const getLanguageBucket = (lang) => {
        const normalized = String(lang || '').toLowerCase();
        if (normalized === 'hindi') return 'hindi';
        if (normalized === 'punjabi') return 'punjabi';
        return '_regional';
    };

    const bucketCounts = { hindi: 0, punjabi: 0, _regional: 0 };

    // Pass 1: Fill each bucket to its minimum, picking highest-scored tracks
    for (const bucket of ['hindi', 'punjabi', '_regional']) {
        const target = targetDistribution[bucket];
        const candidates = rankedItems.filter((item) => {
            const lang = getLanguageBucket(item.track.language);
            return lang === bucket && !usedIds.has(item.track.id);
        });
        for (const item of candidates) {
            if (bucketCounts[bucket] >= target.min) break;
            if (selected.length >= count) break;
            selected.push(item);
            usedIds.add(item.track.id);
            bucketCounts[bucket]++;
        }
    }

    // Pass 2: Fill remaining slots with highest-scored tracks, respecting max limits
    const remaining = rankedItems.filter((item) => !usedIds.has(item.track.id));
    for (const item of remaining) {
        if (selected.length >= count) break;
        const bucket = getLanguageBucket(item.track.language);
        const target = targetDistribution[bucket];
        if (target && bucketCounts[bucket] >= target.max) continue;
        selected.push(item);
        usedIds.add(item.track.id);
        bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
    }

    // Pass 3: If still not enough, add any remaining tracks (ignore language limits)
    if (selected.length < count) {
        const leftover = rankedItems.filter((item) => !usedIds.has(item.track.id));
        for (const item of leftover) {
            if (selected.length >= count) break;
            selected.push(item);
            usedIds.add(item.track.id);
        }
    }

    // Sort by score to maintain quality ordering
    selected.sort((a, b) => b.score - a.score);
    return selected;
}

async function getMoodTracks(profile, preferences = {}, candidateLimit = 80, options = {}) {
    const currentMood = options.currentMood || profile.mood;
    const desiredMood = options.desiredMood || profile.mood;
    const languagePreference = preferences.language || 'All';
    const searchCandidateTracks = options.searchCandidateTracks || searchTracks;
    const queryPlan = buildRetrievalQueryPlan(currentMood, desiredMood, languagePreference);

    const candidatesById = new Map();
    const rawProviderResults = [];
    let rawCount = 0;
    let searchFailures = 0;
    let totalSearchAttempts = 0;
    const queriesUsed = [];

    for (const stage of queryPlan) {
        if (candidatesById.size >= 80) break;
        totalSearchAttempts += stage.queries.length;
        const settled = await mapConcurrentSettled(stage.queries, 8, async (query) => {
            if (searchCandidateTracks === searchTracks) {
                const { list } = await fetchRawSearchResults(query, 12);
                rawCount += list.length;
                rawProviderResults.push({ query, rawCount: list.length, stage: stage.label });
                const tracks = list.map(normalizeTrack).filter(Boolean);
                return { query, moods: stage.queryMood.get(query) || [desiredMood], bridges: stage.queryBridge?.get(query) || [], tracks };
            }
            const tracks = await searchCandidateTracks(query, 12);
            rawProviderResults.push({ query, rawCount: tracks.length, stage: stage.label });
            rawCount += tracks.length;
            return { query, moods: stage.queryMood.get(query) || [desiredMood], bridges: stage.queryBridge?.get(query) || [], tracks };
        });
        settled.forEach((result) => {
            if (result.status === 'rejected') {
                searchFailures += 1;
                return;
            }
            queriesUsed.push(result.value.query);
            const matchedMoods = result.value.moods.filter((mood) => !(mood === 'sad' && /^(emotional|heart touching)\b/i.test(result.value.query)));
            result.value.tracks.forEach((track) => {
                const existing = candidatesById.get(track.id) || track;
                existing._matchedMoods = [...new Set([...(existing._matchedMoods || []), ...matchedMoods])];
                existing._matchedBridges = [...new Set([...(existing._matchedBridges || []), ...(result.value.bridges || [])])];
                candidatesById.set(track.id, existing);
            });
        });
        if (candidatesById.size >= 80) break;
    }

    const allCandidates = dedupe([...candidatesById.values()]);
    const afterNormalization = allCandidates.length;

    // MusicProvider's production recommendation path asks this adapter only
    // for provider-neutral, normalized candidates. Moodify filters, scores and
    // ranks these in recommendation.service after every provider has returned.
    if (options.returnCandidates) {
        if (totalSearchAttempts > 0 && searchFailures >= totalSearchAttempts) {
            throw new Error('Indian catalog search failed for every candidate query');
        }
        options.onDiagnostics?.({
            searchQueries: queriesUsed,
            rawProviderResults,
            rawCount,
            afterNormalization,
            providerRequestSucceeded: totalSearchAttempts > searchFailures,
            searchFailures,
            providerStatus: allCandidates.length ? 'OK' : 'EMPTY',
        });
        return allCandidates.slice(0, candidateLimit);
    }

    const afterRegionFilterList = allCandidates.filter((track) => Number(track.regionConfidence) >= 0.15);
    const afterRegionFilter = afterRegionFilterList.length;

    const requestedLanguage = normalizeLanguage(languagePreference);
    const languageSpecific = !['All', 'Indian', 'Mixed', 'DefaultIndianMix'].includes(languagePreference);
    const languageCountsBeforeFilter = afterRegionFilterList.reduce((counts, track) => {
        const language = normalizeLanguage(track.language);
        counts[language] = (counts[language] || 0) + 1;
        return counts;
    }, {});
    const languageFilteredList = languageSpecific
        ? afterRegionFilterList.filter((track) => normalizeLanguage(track.language) === requestedLanguage)
        : afterRegionFilterList;
    const rejectedLanguages = [...new Set(afterRegionFilterList
        .filter((track) => !languageFilteredList.includes(track))
        .map((track) => normalizeLanguage(track.language)))];
    const languageFilterDiagnostics = {
        requestedLanguage,
        providerCandidateCount: allCandidates.length,
        languageCountsBeforeFilter,
        acceptedLanguage: languageSpecific ? requestedLanguage : 'All Indian languages',
        acceptedCount: languageFilteredList.length,
        rejectedCount: afterRegionFilterList.length - languageFilteredList.length,
        rejectedLanguages,
    };
    const afterQualityFilterList = languageFilteredList.filter((track) => !minimalPoolRejectReason(track));
    const afterQualityFilter = afterQualityFilterList.length;

    const languagePreferenceScored = afterQualityFilterList.map((track) => ({
        track,
        languageBoost: languagePreferenceBoost(track, languagePreference),
    }));
    const afterLanguageScoring = languagePreferenceScored.length;

    const poolRanked = languagePreferenceScored
        .map(({ track, languageBoost }) => ({ track, languageBoost, ...rankTrackForPool(track, currentMood, desiredMood, languagePreference) }))
        .sort((a, b) => b.score - a.score || b.languageBoost - a.languageBoost);

    // ── PROGRESSIVE RELAXATION ──
    // Stage 1: Strict — only tracks with strong negative rejection
    // Stage 2: Relaxed — all tracks that pass quality filter (no mood gating!)
    // Stage 3: Very relaxed — even tracks with minor quality issues
    // Stage 4: Fallback — all provider candidates with region validation only

    let relaxationStage = 'strict';

    // Stage 1: Only hard-reject clearly contradictory tracks (negativeScore >= 24)
    let recommendationPool = poolRanked.filter((item) => item.moodBreakdown.negativeScore < 24);
    let moodCandidates = recommendationPool.length;

    if (recommendationPool.length < 8) {
        // Stage 2: Relaxed, but STILL reject strong contradictions
        relaxationStage = 'relaxed';
        // We already filtered them in Stage 1, so Stage 2 for this array is the same
        // But maybe we can relax other criteria if there were any. 
        // Actually, we don't have other strict mood gates.
    }

    if (recommendationPool.length < 8) {
        // Stage 3: Include tracks that failed minor quality checks
        relaxationStage = 'very-relaxed';
        const extraQuality = languageFilteredList
            .filter((track) => {
                const reason = minimalPoolRejectReason(track);
                // Only keep hard rejections for truly non-music content
                return !reason || !['generic, background, or non-song content',
                    'regionConfidence too low / non-Indian language or origin'].includes(reason);
            })
            .map((track) => ({
                track,
                languageBoost: languagePreferenceBoost(track, languagePreference),
                ...rankTrackForPool(track, currentMood, desiredMood, languagePreference),
            }))
            .filter((item) => item.moodBreakdown.negativeScore < 24)
            .sort((a, b) => b.score - a.score);
        const existingIds = new Set(recommendationPool.map((item) => item.track.id));
        for (const item of extraQuality) {
            if (!existingIds.has(item.track.id)) {
                recommendationPool.push(item);
                existingIds.add(item.track.id);
            }
        }
        moodCandidates = recommendationPool.length;
    }

    if (recommendationPool.length < 8) {
        // Stage 4: Use all region-filtered candidates
        relaxationStage = 'fallback';
        const allRegionFiltered = afterRegionFilterList
            .map((track) => ({
                track,
                languageBoost: languagePreferenceBoost(track, languagePreference),
                ...rankTrackForPool(track, currentMood, desiredMood, languagePreference),
            }))
            .filter((item) => item.moodBreakdown.negativeScore < 24)
            .sort((a, b) => b.score - a.score);
        const existingIds = new Set(recommendationPool.map((item) => item.track.id));
        for (const item of allRegionFiltered) {
            if (!existingIds.has(item.track.id)) {
                recommendationPool.push(item);
                existingIds.add(item.track.id);
            }
        }
        moodCandidates = recommendationPool.length;
    }

    // Re-sort after any relaxation additions
    recommendationPool.sort((a, b) => b.score - a.score);

    const isTransition = currentMood !== desiredMood;
    const rankedById = new Map(recommendationPool.map((item) => [item.track.id, item]));
    const candidateDiagnostics = allCandidates.map((track) => {
        const ranked = rankedById.get(track.id);
        const score = scoreTrack(track, currentMood, desiredMood, languagePreference);
        const transition = calculateTransitionScore(track, currentMood, desiredMood, score.qualityScore);
        return {
            title: track.title,
            artist: track.artist,
            providerLanguage: track._providerLanguage,
            albumLanguage: track._albumLanguage,
            detectedLanguage: track._detectedLanguage,
            requestedLanguage,
            language: track.language,
            contentType: track._contentType || 'UNKNOWN',
            regionConfidence: Number(track.regionConfidence) || 0,
            moodScore: ranked?.moodScore ?? score.moodScore,
            qualityScore: ranked?.qualityScore ?? score.qualityScore,
            finalScore: ranked?.score ?? score.score,
            currentMoodScore: ranked?.currentMoodScore ?? transition.currentMoodScore,
            desiredMoodScore: ranked?.desiredMoodScore ?? transition.desiredMoodScore,
            bridgeScore: ranked?.bridgeScore ?? transition.bridgeScore,
            currentMoodPenalty: ranked?.currentMoodPenalty ?? transition.currentMoodPenalty,
            transitionScore: ranked?.transitionScore ?? transition.transitionScore,
            rejectionReason: minimalPoolRejectReason(track) || score.reason || null,
            inPool: Boolean(ranked),
        };
    });

    // ── Language-Balanced Selection ──
    // Apply Indian language weighting to the final selection.
    const diversifiedPool = selectWithLanguageBalance(recommendationPool, Math.min(30, candidateLimit), languagePreference);

    const poolLimit = Math.min(30, candidateLimit);
    const takeLanguageDiverse = (items, count) => {
        const languageCounts = new Map();
        const artistCounts = new Map();
        const albumCounts = new Map();
        const result = [];
        for (const item of items) {
            const language = String(item.track.language || 'unknown').toLowerCase();
            const artist = String(item.track.artist || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            const album = String(item.track._albumName || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            if ((languageCounts.get(language) || 0) >= 4
                || (artistCounts.get(artist) || 0) >= 3
                || (album && (albumCounts.get(album) || 0) >= 3)) continue;
            languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
            artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
            if (album) albumCounts.set(album, (albumCounts.get(album) || 0) + 1);
            result.push(item);
            if (result.length >= count) break;
        }
        // Diversity is soft: fill remaining places with the best qualified tracks.
        for (const item of items) {
            if (result.length >= count) break;
            if (!result.some(({ track }) => track.id === item.track.id)) result.push(item);
        }
        return result;
    };
    let top;
    if (isTransition) {
        const openingPool = recommendationPool
            .filter(({ track, currentMoodScore }) => track._matchedMoods?.includes(currentMood)
                && !track._matchedMoods?.includes(desiredMood) && currentMoodScore >= 20) // Lowered from 34
            .sort((a, b) => b.currentMoodScore - a.currentMoodScore || b.score - a.score);
        const openingQuota = Math.min(Math.ceil(poolLimit * 0.2), openingPool.length);
        const openingIds = new Set(openingPool.slice(0, openingQuota).map(({ track }) => track.id));
        const orderedCandidates = [
            ...openingPool.filter(({ track }) => openingIds.has(track.id)),
            ...recommendationPool.filter(({ track }) => !openingIds.has(track.id)),
        ];
        top = takeLanguageDiverse(orderedCandidates, poolLimit);
    } else {
        top = diversifiedPool.slice(0, poolLimit);
    }
    const finalCandidates = top.length;

    // Compute final language distribution
    const finalLanguageDistribution = top.reduce((counts, item) => {
        const lang = normalizeLanguage(item.track.language);
        counts[lang] = (counts[lang] || 0) + 1;
        return counts;
    }, {});

    const providerRequestSucceeded = totalSearchAttempts > 0 && searchFailures < totalSearchAttempts;
    const providerReturnedCandidates = finalCandidates > 0;
    const providerStatus = !providerRequestSucceeded ? 'ERROR' : providerReturnedCandidates ? 'OK' : 'EMPTY';

    const debugPayload = {
        searchQueries: queriesUsed,
        rawProviderResults,
        rawCount,
        afterNormalization,
        afterRegionFilter,
        afterLanguageScoring,
        afterQualityFilter,
        moodCandidates,
        finalCandidates,
        relaxationStage,
        providerRequestSucceeded,
        providerReturnedCandidates,
        providerStatus,
        searchFailures,
        candidateDiagnostics,
        languageFilter: languageFilterDiagnostics,
        finalLanguageDistribution,
    };
    logIndianProviderDebug(debugPayload);

    const clearlyIndian = afterRegionFilterList.filter((track) => Number(track.regionConfidence) >= 0.8);
    const rejected = allCandidates
        .filter((track) => minimalPoolRejectReason(track) || Number(track.regionConfidence) < 0.15)
        .map((track) => ({ track, reason: minimalPoolRejectReason(track) || 'regionConfidence too low / non-Indian language or origin' }));

    const selectedTransitionScores = top.map((item) => item.transitionScore || 0);
    const transitionDiagnostics = {
        currentMood,
        desiredMood,
        isTransition: currentMood !== desiredMood,
        currentMoodWeight: TRANSITION_WEIGHTS.current,
        desiredMoodWeight: TRANSITION_WEIGHTS.desired,
        bridgeWeight: TRANSITION_WEIGHTS.bridge,
        candidateExamples: candidateDiagnostics.slice(0, 12),
        selectedTracks: top.map(({ track, transitionScore, currentMoodScore, desiredMoodScore, bridgeScore, currentMoodPenalty }) => ({
            title: track.title,
            artist: track.artist,
            language: track.language,
            currentMoodScore,
            desiredMoodScore,
            bridgeScore,
            currentMoodPenalty,
            transitionScore,
        })),
        averageCurrentMoodScore: top.length ? Number(top.reduce((sum, item) => sum + (item.currentMoodScore || 0), 0) / top.length).toFixed(2) : 0,
        averageDesiredMoodScore: top.length ? Number(top.reduce((sum, item) => sum + (item.desiredMoodScore || 0), 0) / top.length).toFixed(2) : 0,
        averageTransitionScore: selectedTransitionScores.length ? Number(selectedTransitionScores.reduce((sum, score) => sum + score, 0) / selectedTransitionScores.length).toFixed(2) : 0,
    };
    const diagnostics = {
        ...debugPayload,
        currentMood,
        desiredMood,
        region: 'Indian',
        languagePreference,
        queriesUsed,
        candidateCount: recommendationPool.length,
        indianCandidateCount: clearlyIndian.length,
        filteredCount: rejected.length,
        rawCandidates: afterNormalization,
        validSongCandidates: moodCandidates,
        providerFailures: searchFailures,
        relaxationStage,
        finalLanguageDistribution,
        topCandidates: top.slice(0, 30).map(({ track, score, regionConfidence, moodScore, qualityScore, relevanceScore, transitionScore, moodBreakdown, languageBoost, languageWeightBoost }) =>
            ({ title: track.title, artist: track.artist, language: track.language, contentType: track._contentType || 'UNKNOWN', regionConfidence, moodScore, qualityScore, relevanceScore, score, transitionScore, languageBoost, languageWeightBoost, moodBreakdown })),
        rejectedCandidates: rejected.slice(0, 40).map(({ track, reason }) =>
            ({ title: track.title, artist: track.artist, contentType: track._contentType || 'UNKNOWN', reason, regionConfidence: track.regionConfidence })),
        candidateDiagnostics,
        transition: transitionDiagnostics,
        rejectionReasons: rejected.reduce((counts, item) => { counts[item.reason] = (counts[item.reason] || 0) + 1; return counts; }, {}),
    };
    logMoodTransitionDebug(transitionDiagnostics);
    logLanguageFilterDebug({
        ...languageFilterDiagnostics,
        moodCandidates,
        qualityCandidates: afterQualityFilter,
        finalCandidates,
        finalLanguageDistribution,
    });
    options.onDiagnostics?.(diagnostics);

    return top.map(({ track, score, moodScore, qualityScore, relevanceScore, regionConfidence, moodBreakdown, languageBoost, languageWeightBoost, transitionScore, currentMoodScore, desiredMoodScore, bridgeScore, currentMoodPenalty }) => {
        const { _raw, _matchedMoods, _matchedBridges, _popularity, _contentType, ...song } = track;
        song._recommendation = {
            score, moodScore, qualityScore, relevanceScore, regionConfidence, languageConfidence: track.languageConfidence,
            moodBreakdown, languageBoost, languageWeightBoost, transitionScore, currentMoodScore, desiredMoodScore, bridgeScore, currentMoodPenalty,
            reasons: moodBreakdown?.reasons || [],
        };
        return song;
    });
}

module.exports = {
    searchTracks,
    getCandidateTracks: (profile, preferences = {}, candidateLimit = 80, options = {}) => module.exports.getMoodTracks(profile, preferences, candidateLimit, { ...options, returnCandidates: true }),
    getMoodTracks,
    debugSearch,
    scoreTrack,
    calculateMoodScore,
    intentsFor,
    normalizeTrack,
    resolveLanguageAndRegion,
    fetchRawSearchResults,
};
