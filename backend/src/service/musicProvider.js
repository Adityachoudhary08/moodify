const indianMusicService = require('./indianMusic.service');
const audiusService = require('./audius.service');

const INDIAN_LANGUAGE_NAMES = new Set([
    'hindi', 'punjabi', 'tamil', 'telugu', 'bengali', 'marathi', 'gujarati', 'malayalam', 'kannada',
    'odia', 'assamese', 'urdu', 'bhojpuri', 'kashmiri', 'konkani', 'manipuri', 'sanskrit', 'sindhi',
    'haryanvi', 'rajasthani', 'chhattisgarhi',
]);

function normalizeRequestedRegion(region, language = 'Hindi') {
    const value = String(region || 'Mix').trim();
    const normalized = value.toLowerCase();
    if (['mix', 'mixed', 'your mix', 'indian + international', 'indian and international', 'indian/international'].includes(normalized)) return 'Mix';
    if (normalized === 'international') return 'International';
    if (normalized === 'indian') return 'Indian';
    if (normalized === 'surprise') return String(language || '').toLowerCase() === 'english' ? 'International' : 'Indian';
    return 'Indian';
}

function getMusicProvider(requestedRegion, language = 'Hindi') {
    const providerRegion = normalizeRequestedRegion(requestedRegion, language);
    if (providerRegion === 'Mix') {
        return { name: 'MoodMixProvider', providerRegion: 'Mix', service: null };
    }
    if (providerRegion === 'Indian') {
        return {
            name: 'IndianMusicProvider',
            providerRegion: 'Indian',
            service: indianMusicService,
        };
    }
    return {
        name: 'InternationalMusicProvider',
        providerRegion: 'International',
        service: audiusService,
    };
}

function isIndianLanguage(language) {
    if (!language) return false;
    return INDIAN_LANGUAGE_NAMES.has(String(language).toLowerCase());
}

function trackMatchesRequestedRegion(track, requestedRegion) {
    const region = normalizeRequestedRegion(requestedRegion);
    const source = String(track.source || '').toLowerCase();
    const confidence = Number(track.regionConfidence);

    if (region === 'Mix') {
        if (source === 'jiosaavn') return confidence >= 0.8;
        if (source === 'audius') return true;
        return source === 'moodify-library' && (!track.language || isIndianLanguage(track.language));
    }

    if (region === 'Indian') {
        if (source === 'audius') return false;
        if (source === 'jiosaavn' && confidence >= 0.8) return true;
        if (source === 'moodify-library' && isIndianLanguage(track.language)) return true;
        return false;
    }

    if (source === 'jiosaavn') return false;
    if (source === 'audius') return true;
    if (source === 'moodify-library') return !isIndianLanguage(track.language) || !track.language;
    return source !== 'jiosaavn';
}

function filterTracksForRegion(tracks, requestedRegion) {
    const accepted = [];
    const rejected = [];
    for (const track of tracks) {
        if (trackMatchesRequestedRegion(track, requestedRegion)) accepted.push(track);
        else rejected.push(track);
    }
    return { accepted, rejected };
}

module.exports = {
    getMusicProvider,
    normalizeRequestedRegion,
    trackMatchesRequestedRegion,
    filterTracksForRegion,
    isIndianLanguage,
};

