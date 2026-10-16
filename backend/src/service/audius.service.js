const axios = require('axios');

const api = axios.create({
    baseURL: process.env.AUDIUS_API_URL || 'https://discoveryprovider.audius.co/v1',
    timeout: 8000,
});

const appName = process.env.AUDIUS_APP_NAME || 'moodify';

function normalizeTrack(track) {
    if (!track?.id || track.streamable === false) return null;
    const rawTags = track.tags || [];
    const tags = (Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? rawTags.split(',') : Object.values(rawTags))
        .map((tag) => typeof tag === 'string' ? tag : tag?.name || tag?.title || '')
        .map((tag) => tag.trim()).filter(Boolean);

    return {
        id: `audius-${track.id}`,
        title: track.title || 'Untitled track',
        artist: track.user?.name || 'Unknown artist',
        artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'] || null,
        duration: Number(track.duration) || 0,
        streamUrl: `${api.defaults.baseURL}/tracks/${track.id}/stream?app_name=${encodeURIComponent(appName)}`,
        source: 'audius',
        region: 'International',
        regionConfidence: 0.98,
        language: track.language || null,
        languageConfidence: track.language ? 0.8 : 0.2,
        genre: track.genre || null,
        tags,
        mood: null,
        permalink: track.permalink || null,
    };
}

async function searchTracks(query, limit = 20) {
    const response = await api.get('/tracks/search', {
        params: {
            query,
            limit,
            app_name: appName,
        },
    });

    return (response.data?.data || [])
        .map(normalizeTrack)
        .filter(Boolean);
}

async function getMoodTracks(profile, preferences = {}, candidateLimit = 30, options = {}) {
    const moodIntents = {
        sad: ['sad songs', 'emotional music', 'heartbreak songs', 'melancholy music', 'reflective songs'],
        happy: ['happy songs', 'feel good music', 'uplifting songs', 'joyful upbeat music'],
        energetic: ['energetic music', 'upbeat songs', 'dance music', 'high energy songs'],
        relaxed: ['chill music', 'mellow songs', 'calm music', 'soft acoustic songs'],
        chill: ['chill music', 'mellow songs', 'soft pop'],
        calm: ['calm music', 'peaceful songs', 'soft acoustic songs'],
        romantic: ['romantic songs', 'love songs', 'heartfelt music'],
        confident: ['confident music', 'bold songs', 'powerful music'],
        motivated: ['motivational music', 'inspiring songs', 'empowering music'],
    };
    const currentMood = options.currentMood || profile.mood;
    const desiredMood = options.desiredMood || profile.mood;
    const baseTerms = [...(profile.musicTags || []), ...(profile.genres || [])];
    const transitionTerms = currentMood !== desiredMood
        ? currentMood === 'sad' && desiredMood === 'happy' ? ['hopeful songs', 'warm uplifting music', 'positive feel good songs']
            : ['hopeful music', 'warm songs', 'uplifting music']
        : [];
    const searchTerms = [...new Set([
        ...(moodIntents[currentMood] || []),
        ...(moodIntents[desiredMood] || []),
        ...transitionTerms,
        ...baseTerms,
    ])];
    const results = await Promise.allSettled(
        searchTerms.map((term) => searchTracks(term, Math.ceil(candidateLimit / 2)))
    );
    if (searchTerms.length && results.every((result) => result.status === 'rejected')) {
        throw new Error('International catalog search failed for every candidate query');
    }

    const uniqueTracks = new Map();
    results.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        result.value.forEach((track) => uniqueTracks.set(track.id, track));
    });

    // Search is candidate generation only. Mood relevance, quality and final
    // ranking are decided by Moodify's shared recommendation service.
    return [...uniqueTracks.values()].slice(0, candidateLimit);
}

module.exports = {
    searchTracks,
    getMoodTracks,
};
