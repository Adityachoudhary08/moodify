const test = require('node:test');
const assert = require('node:assert/strict');
const forge = require('node-forge');
const indian = require('../src/service/indianMusic.service');
const recommendation = require('../src/service/recommendation.service');
const { filterTracksForRegion } = require('../src/service/musicProvider');
const audius = require('../src/service/audius.service');

const moodTags = {
    happy: ['upbeat', 'joyful'], sad: ['heartbreak', 'melancholy'], energetic: ['energetic', 'dance'],
    chill: ['mellow', 'soft'], relaxed: ['mellow', 'peaceful'], calm: ['soothing', 'peaceful'],
    romantic: ['romantic', 'love'], confident: ['bold', 'power'], motivated: ['inspiring', 'victory'],
};

function qualifiedTrack(id, mood = 'happy', source = 'jiosaavn', language = source === 'audius' ? 'English' : 'Hindi') {
    return {
        id, title: `Catalog selection ${id}`, artist: `Artist ${id}`, source, region: source === 'audius' ? 'International' : 'Indian',
        language, regionConfidence: 0.98, languageConfidence: 0.98, genre: 'Pop', tags: moodTags[mood] || ['upbeat'],
        duration: 220, artwork: '/artwork.jpg', streamUrl: `/stream/${id}`, permalink: `/track/${id}`,
        _albumName: `Album ${id}`, _popularity: 5000, _raw: { type: 'song' },
    };
}

test('Indian intent sets cover all supported languages and requested moods', () => {
    const languages = ['Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Malayalam', 'Kannada', 'Odia', 'Assamese', 'Urdu'];
    const sadQueries = indian.intentsFor('sad', 'All');
    for (const language of languages) assert(sadQueries.some((query) => query.includes(language)));
    for (const mood of ['happy', 'energetic', 'relaxed', 'romantic', 'confident', 'motivated', 'calm']) {
        assert(indian.intentsFor(mood, 'Hindi').length >= 3, `${mood} should have multiple search intents`);
    }
});

test('negative meditation and instrumental matches are excluded from sad ranking', () => {
    const sadTrack = { id: 'song-1', title: 'Agar Tum Saath Ho', artist: 'Playback singer', genre: 'Film soundtrack', language: 'Hindi', duration: 240, artwork: 'art', permalink: '/song', _raw: { type: 'song' }, _matchedMoods: ['sad'] };
    const fluteTrack = { ...sadTrack, id: 'song-2', title: 'Indian Acoustic Flute', genre: 'Meditation music', _matchedMoods: [] };
    const genericEmotionalTrack = { ...sadTrack, id: 'song-3', title: 'Emotional Relaxing Song', _matchedMoods: [] };
    assert(indian.scoreTrack(sadTrack, 'sad', 'sad', 'All').score > 1);
    assert.match(indian.scoreTrack(fluteTrack, 'sad', 'sad', 'All').reason, /ambient, instrumental, or non-song/);
    assert.equal(indian.scoreTrack(genericEmotionalTrack, 'sad', 'sad', 'All').reason, null);
});

test('region metadata distinguishes Indian languages, explicit foreign languages, and uncertainty', () => {
    assert.equal(indian.resolveLanguageAndRegion({ language: 'Punjabi' }).regionConfidence, 0.95);
    assert.equal(indian.resolveLanguageAndRegion({ language: 'Japanese' }).regionConfidence, 0.03);
    assert.equal(indian.resolveLanguageAndRegion({ language: 'English' }).regionConfidence, 0.35);
    assert.equal(indian.resolveLanguageAndRegion({ title: 'கண்ணான கண்ணே' }).language, 'Tamil');
    const genericHappy = { title: 'Happy Time', artist: 'Singer', language: 'Hindi', genre: 'Film soundtrack', _matchedMoods: ['happy'], duration: 220, artwork: 'art' };
    assert.equal(indian.scoreTrack(genericHappy, 'happy', 'happy', 'All').reason, 'weak evidence that candidate is a playable song');
});

test('generic happy words and feel-good collections stay weak without independent song evidence', () => {
    const weakTitles = ['Happy Tuesday', 'Happy Time', 'Feel Good KLICKAUD', 'Music P & Marque Aurel - The Feel Good Funk', 'Make Me Feel Good', 'Happy-Holi-2024'];
    for (const [index, title] of weakTitles.entries()) {
        const track = { id: `weak-${index}`, title, artist: 'Unknown artist', language: index === 3 ? 'English' : 'Hindi',
            regionConfidence: index === 3 ? 0.03 : 0.95, languageConfidence: 0.98, genre: null,
            _albumName: null, _collectionName: 'Feel Good Bollywood', _matchedMoods: ['happy'], duration: 220,
            streamUrl: '/stream', permalink: '/track', artwork: '/art', _raw: { type: 'song' } };
        const result = indian.scoreTrack(track, 'happy', 'happy', 'All');
        assert(result.moodScore <= 35, `${title} should receive a low mood score`);
        assert(indian.calculateMoodScore(track, 'happy').collectionMoodScore <= 3);
    }
});

test('collection metadata can support a genuine Indian upbeat song without dominating its score', () => {
    const song = { id: 'real-song', title: 'Naina Da Kya Kasoor', artist: 'Amit Trivedi', language: 'Hindi',
        regionConfidence: 0.95, languageConfidence: 0.98, genre: 'Indian pop', tags: ['upbeat', 'playful'],
        _collectionName: 'Feel Good Bollywood', _matchedMoods: ['happy'], duration: 225, streamUrl: '/stream',
        permalink: '/track', artwork: '/art', _raw: { type: 'song' } };
    const result = indian.scoreTrack(song, 'happy', 'happy', 'All');
    const breakdown = indian.calculateMoodScore(song, 'happy');
    assert.equal(result.reason, null);
    assert(result.moodScore >= 20);
    assert(breakdown.tagMoodScore > breakdown.collectionMoodScore);
    assert.equal(breakdown.collectionDominates, false);
});

test('mood candidate generation ranks verified Indian tracks above generic titles and foreign results', async () => {
    const languageNames = ['Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Malayalam', 'Kannada', 'Odia', 'Assamese', 'Urdu', 'Bhojpuri', 'Kashmiri', 'Konkani', 'Manipuri', 'Sanskrit', 'Sindhi', 'Haryanvi', 'Rajasthani', 'Chhattisgarhi'];
    for (const mood of ['sad', 'happy', 'energetic', 'relaxed', 'romantic', 'confident', 'motivated', 'calm']) {
        let diagnostics;
        let queryCount = 0;
        const tag = { sad: 'heartbreak', happy: 'upbeat', energetic: 'dance', relaxed: 'mellow', romantic: 'romantic', confident: 'power', motivated: 'inspiring', calm: 'soothing' }[mood];
        const supportingTag = { sad: 'melancholy', happy: 'joyful', energetic: 'high energy', relaxed: 'peaceful', romantic: 'love', confident: 'bold', motivated: 'empowering', calm: 'serene' }[mood];
        const tracks = await indian.getMoodTracks({ mood }, { language: 'All' }, 80, {
            currentMood: mood, desiredMood: mood, onDiagnostics: (value) => { diagnostics = value; },
            searchCandidateTracks: async (query) => {
                queryCount += 1;
                const language = languageNames.find((name) => query.toLowerCase().includes(name.toLowerCase())) || 'Hindi';
                return [0, 1].map((index) => ({ id: `${query}-${index}`, title: `Catalog Track ${query} ${index}`, artist: `Artist ${query} ${index}`,
                    duration: 220, language, genre: 'Pop', tags: [tag, supportingTag], mood: null, permalink: `/song/${index}`, streamUrl: `/stream/${index}`,
                    artwork: '/art.jpg', regionConfidence: 0.95, languageConfidence: 0.98, regionReason: 'Indian language metadata',
                    _albumName: `Album ${query} ${index}`, _popularity: 5000, _raw: { type: 'song' } }));
            },
        });
        assert(queryCount >= 10, `${mood} should search many mood/language intents`);
        assert(diagnostics.candidateCount >= 10, `${mood} should rank a large candidate pool`);
        assert(tracks.length >= 10, `${mood}: scoring returns candidates from the pool`);
        assert(tracks.every((track) => track.regionConfidence >= 0.8));
        assert(tracks.some((track) => track.language === 'Hindi'));
        assert(diagnostics.queriesUsed.some((query) => /Bollywood songs$/i.test(query)));
    }
});

test('candidate generation retains both ends of requested mood journeys', async () => {
    const moods = [
        ['sad', 'happy', 'heartbreak'],
        ['happy', 'chill', 'upbeat'],
        ['energetic', 'chill', 'dance'],
    ];
    for (const [currentMood, desiredMood] of moods) {
        const tracks = await indian.getMoodTracks({ mood: currentMood }, { language: 'All' }, 80, {
            currentMood, desiredMood,
            searchCandidateTracks: async (query) => {
                const first = query.toLowerCase().split(' ')[0];
                const tag = /^(sad|heartbreak|melancholy|emotional|breakup)$/.test(first) ? 'heartbreak'
                    : /^(happy|feel)$/.test(first) ? 'upbeat'
                        : /^(energetic|upbeat|dance|party|high)$/.test(first) ? 'dance'
                            : /^(chill|mellow|laid|easy|soft|calm|soothing)$/.test(first) ? 'mellow' : 'joyful';
                const lang = query.match(/\b(Hindi|Punjabi|Tamil|Telugu|Bengali|Marathi|Gujarati|Malayalam|Kannada|Odia|Assamese|Urdu) songs$/i)?.[1] || 'Hindi';
                const supportingTag = { heartbreak: 'melancholy', upbeat: 'joyful', dance: 'energetic', mellow: 'peaceful', joyful: 'uplifting' }[tag] || 'uplifting';
                return [{ id: `${query}-song`, title: `Journey ${query}`, artist: `Artist ${query}`, artwork: '/art', duration: 220,
                    streamUrl: '/stream', source: 'jiosaavn', language: lang, genre: `Album ${query}`, tags: [tag, supportingTag], permalink: `/song/${query}`,
                    regionConfidence: 0.95, languageConfidence: 0.98, _albumName: `Album ${query}`, _popularity: 3000, _raw: { type: 'song' } }];
            },
        });
        assert(tracks.some((track) => track._recommendation.currentMoodScore > 0), `${currentMood} opening phase should remain in the candidate pool`);
        assert(tracks.some((track) => track._recommendation.desiredMoodScore > 0), `${desiredMood} destination phase should remain in the candidate pool`);
    }
});

test('Indian catalog adapter returns normalized raw candidates to the shared recommender', async () => {
    const candidates = await indian.getCandidateTracks({ mood: 'happy' }, { language: 'Hindi', region: 'Indian' }, 20, {
        currentMood: 'happy', desiredMood: 'happy',
        searchCandidateTracks: async (query) => [{ id: query, title: 'Happy Anniversary', artist: 'Singer', source: 'jiosaavn', language: 'Hindi', regionConfidence: 0.95, mood: null }],
    });
    assert(candidates.length > 0);
    assert(candidates.every((track) => track.source === 'jiosaavn' && track.regionConfidence >= 0.8));
    assert(candidates.every((track) => track._recommendation === undefined));
    assert(candidates.every((track) => track.mood === null));
});

test('provider adapter normalizes legacy metadata and encrypted stream URLs', () => {
    const cipher = forge.cipher.createCipher('DES-ECB', forge.util.createBuffer('38346591'));
    cipher.start();
    cipher.update(forge.util.createBuffer('https://cdn.example.test/song.mp3'));
    cipher.finish();
    const encryptedUrl = forge.util.encode64(cipher.output.getBytes());
    const song = indian.normalizeTrack({
        id: 'legacy-1', title: 'Film Song', subtitle: 'Singer', duration: '220', language: 'Tamil',
        image: [{ quality: '500', url: 'https://cdn.example.test/art.jpg' }],
        more_info: { album: 'Film soundtrack', encrypted_media_url: encryptedUrl },
        url: 'https://www.jiosaavn.com/song/film-song',
    });
    assert.equal(song.streamUrl, 'https://cdn.example.test/song.mp3');
    assert.equal(song.title, 'Film Song');
    assert.equal(song.artist, 'Singer');
    assert.equal(song.language, 'Tamil');
});

test('Indian playlists use only the Indian provider and pass both transition moods', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    let transition;
    try {
        indian.getMoodTracks = async (_profile, _preferences, _poolSize, moods) => {
            transition = moods;
            return Array.from({ length: 20 }, (_, i) => qualifiedTrack(`in-${i}`, i < 10 ? moods.currentMood : moods.desiredMood, 'jiosaavn', i < 10 ? 'Hindi' : 'Punjabi'));
        };
        audius.getMoodTracks = async () => { throw new Error('International provider must not run for region=Indian'); };
        for (const [currentMood, desiredMood] of [['sad', 'energetic'], ['sad', 'happy'], ['happy', 'chill'], ['energetic', 'chill']]) {
            const result = await recommendation.recommendTracks({ mood: currentMood }, null, { region: 'Indian', language: 'All' }, 10, { currentMood, desiredMood });
            assert.equal(result.tracks.length, 10);
            assert.equal(result.tracks.filter((track) => track.source === 'jiosaavn').length, 10);
            assert.equal(result.selectedProvider, 'IndianMusicProvider');
            assert.equal(result.fallbackTriggered, false);
            assert.equal(transition.currentMood, currentMood);
            assert.equal(transition.desiredMood, desiredMood);
            const firstTarget = result.tracks.findIndex((track) => track.tags?.some((tag) => moodTags[desiredMood]?.includes(tag)));
            if (firstTarget !== -1) assert(result.tracks.slice(firstTarget).every((track) => !track.tags?.some((tag) => moodTags[currentMood]?.includes(tag))));
        }
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('default mix uses verified Indian and international catalogs without mislabeling either source', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => Array.from({ length: 10 }, (_, i) => qualifiedTrack(`mix-in-${i}`, 'happy', 'jiosaavn', ['Hindi', 'Hindi', 'Hindi', 'Hindi', 'Punjabi', 'Tamil', 'Hindi', 'Hindi', 'Bengali', 'Hindi'][i]));
        audius.getMoodTracks = async () => Array.from({ length: 10 }, (_, i) => qualifiedTrack(`mix-intl-${i}`, 'happy', 'audius', 'English'));
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { language: 'All' }, 10,
            { currentMood: 'happy', desiredMood: 'happy' });
        assert.equal(result.requestedRegion, 'Mix');
        assert.equal(result.tracks.length, 10);
        assert.equal(result.tracks.filter((track) => track.source === 'jiosaavn').length, 6);
        assert.equal(result.tracks.filter((track) => track.source === 'audius').length, 4);
        assert.equal(result.providers.indian, 'available');
        assert.equal(result.providers.international, 'available');
        assert.equal(result.finalRegionValidation.passed, true);
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('default mix uses a labeled international fallback when no verified Indian tracks are available', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [];
        audius.getMoodTracks = async () => Array.from({ length: 10 }, (_, i) => qualifiedTrack(`only-intl-${i}`, 'happy', 'audius'));
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { language: 'All' }, 8,
            { currentMood: 'happy', desiredMood: 'happy' });
        assert.equal(result.success, true);
        assert(result.tracks.length > 0);
        assert(result.tracks.every((track) => track.source === 'audius'));
        assert.equal(result.fallbackTriggered, true);
        assert.equal(result.fallbackProvider, 'InternationalMusicProvider');
        assert.equal(result.requestedRegion, 'Mix');
        assert.equal(result.providers.indian, 'no-relevant-tracks');
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('Indian final selection rejects foreign/uncertain songs when verified diverse tracks are available', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        const verified = Array.from({ length: 10 }, (_, i) => qualifiedTrack(`verified-${i}`, 'happy', 'jiosaavn', i < 6 ? 'Hindi' : ['Punjabi', 'Tamil', 'Bengali', 'Marathi'][i - 6]));
        const untrusted = [
            { id: 'foreign', title: 'Viva Happy', artist: 'Hatsune Miku', source: 'jiosaavn', language: 'Japanese', regionConfidence: 0.03 },
            { id: 'uncertain', title: 'Happy Time', artist: 'Unknown artist', source: 'jiosaavn', language: null, regionConfidence: 0.35 },
        ];
        indian.getMoodTracks = async () => [...verified, ...untrusted];
        audius.getMoodTracks = async () => [];
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'All' }, 8);
        assert.equal(result.tracks.length, 8);
        assert(!result.tracks.some((track) => ['foreign', 'uncertain'].includes(track.id)));
        assert(result.tracks.filter((track) => track.language !== 'Hindi').length >= 3);
        assert.equal(new Set(result.tracks.map((track) => track.artist)).size, 8);
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('Indian recommendation returns fewer songs when only a few candidates pass quality filters', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => Array.from({ length: 4 }, (_, i) => qualifiedTrack(`qualified-${i}`, 'happy'));
        audius.getMoodTracks = async () => [];
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'All' }, 8);
        assert.equal(result.tracks.length, 4);
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('Indian provider failure returns no international tracks and reports INDIAN_PROVIDER_UNAVAILABLE', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => { throw new Error('provider unavailable'); };
        audius.getMoodTracks = async () => { throw new Error('International provider must not run for region=Indian'); };
        const failed = await recommendation.recommendTracks({ mood: 'sad' }, null, { region: 'Indian', language: 'All' }, 8);
        assert.deepEqual(failed.tracks, []);
        assert.equal(failed.success, false);
        assert.equal(failed.error, 'INDIAN_PROVIDER_UNAVAILABLE');
        assert.equal(failed.providers.indian, 'failed');
        assert.equal(failed.fallbackTriggered, false);
        assert.equal(failed.selectedProvider, 'IndianMusicProvider');
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('region gate rejects audius tracks before Indian responses are returned', () => {
    const gate = filterTracksForRegion([
        { id: 'au-1', title: 'Happy Hour', source: 'audius', regionConfidence: 0.1 },
        { id: 'in-1', title: 'Bollywood Hit', source: 'jiosaavn', language: 'Hindi', regionConfidence: 0.98 },
    ], 'Indian');
    assert.equal(gate.accepted.length, 1);
    assert.equal(gate.rejected.length, 1);
    assert.equal(gate.accepted[0].source, 'jiosaavn');
});

test('region validation rejects audius tracks for Indian responses', async () => {
    const originalIndian = indian.getMoodTracks;
    try {
        indian.getMoodTracks = async () => ([
            { id: 'au-1', title: 'Future Chess Club - Happy', artist: 'Ghostchild', source: 'audius', regionConfidence: 0.1, duration: 220, streamUrl: '/s' },
            qualifiedTrack('in-1', 'happy'),
        ]);
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'All' }, 8);
        assert.equal(result.tracks.length, 1);
        assert.equal(result.tracks[0].source, 'jiosaavn');
        assert(!result.tracks.some((track) => track.source === 'audius'));
    } finally {
        indian.getMoodTracks = originalIndian;
    }
});

test('international catalog can be requested independently and repeated selection stays bounded', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => { throw new Error('must not call Indian provider'); };
        audius.getMoodTracks = async () => Array.from({ length: 40 }, (_, i) => qualifiedTrack(`intl-${i}`, 'sad', 'audius'));
        const first = await recommendation.recommendTracks({ mood: 'sad' }, null, { region: 'International', language: 'English' }, 8);
        const second = await recommendation.recommendTracks({ mood: 'sad' }, null, { region: 'International', language: 'English' }, 8);
        assert.equal(first.tracks.length, 8);
        assert.equal(second.tracks.length, 8);
        assert.equal(first.providers.indian, 'not-requested');
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('international search results must pass mood scoring; titles and provider queries alone are insufficient', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [];
        audius.getMoodTracks = async () => [
            { id: 'celebration', title: 'Celebration of Life', artist: 'Unknown artist', source: 'audius', region: 'International', regionConfidence: 0.98, duration: 220, artwork: '/art', streamUrl: '/stream', permalink: '/track', _raw: { type: 'song' } },
            { id: 'party', title: 'Wedding Party Mix', artist: 'DJ', source: 'audius', region: 'International', regionConfidence: 0.98, duration: 220, artwork: '/art', streamUrl: '/stream', tags: ['wedding', 'festival'], _raw: { type: 'song' } },
        ];
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'International', language: 'All' }, 8);
        assert(result.tracks.length > 0);
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('sad playlists reject wedding, festival and party signals even when titles look positive', async () => {
    const originalIndian = indian.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [
            ...Array.from({ length: 5 }, (_, i) => qualifiedTrack(`real-sad-${i}`, 'sad')),
            ...Array.from({ length: 5 }, (_, i) => ({ ...qualifiedTrack(`wedding-${i}`, 'happy'), title: `Wedding Celebration ${i}`, tags: ['wedding', 'festival', 'dance'] })),
        ];
        const result = await recommendation.recommendTracks({ mood: 'sad' }, null, { region: 'Indian', language: 'All' }, 8);
        assert(result.tracks.length > 0);
        assert(result.tracks.every((track) => !/wedding|festival|party|celebration/i.test(`${track.title} ${(track.tags || []).join(' ')}`)));
    } finally {
        indian.getMoodTracks = originalIndian;
    }
});

test('sad to happy selection keeps a short sad opening, then bridge or destination tracks', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [
            ...Array.from({ length: 4 }, (_, i) => qualifiedTrack(`transition-sad-${i}`, 'sad')),
            ...Array.from({ length: 12 }, (_, i) => qualifiedTrack(`transition-happy-${i}`, 'happy')),
        ];
        audius.getMoodTracks = async () => [];
        const result = await recommendation.recommendTracks({ mood: 'sad' }, null, { region: 'Indian', language: 'Mixed' }, 8,
            { currentMood: 'sad', desiredMood: 'happy' });
        assert.equal(result.tracks.length, 8);
        const isOpening = (track) => track.tags.some((tag) => moodTags.sad.includes(tag));
        const firstDestination = result.tracks.findIndex((track) => !isOpening(track));
        assert(firstDestination >= 0 && firstDestination <= 2, 'transition should open with at most two current-mood tracks');
        assert(result.tracks.slice(firstDestination).every((track) => !isOpening(track)), 'playlist should move toward happy and not return to sad tracks');
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('Indian plus International selects only qualified candidates and keeps an approximate 60/40 mix', async () => {
    const originalIndian = indian.getMoodTracks;
    const originalAudius = audius.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [
            ...Array.from({ length: 12 }, (_, i) => qualifiedTrack(`qualified-in-${i}`, 'happy')),
            { id: 'irrelevant-in', title: 'Celebration of Vaasudha', artist: 'Unknown artist', source: 'jiosaavn', language: 'Hindi', regionConfidence: 0.98, duration: 220, streamUrl: '/stream' },
        ];
        audius.getMoodTracks = async () => [
            ...Array.from({ length: 12 }, (_, i) => qualifiedTrack(`qualified-intl-${i}`, 'happy', 'audius')),
            { id: 'irrelevant-intl', title: 'Life Mix', artist: 'Unknown artist', source: 'audius', region: 'International', regionConfidence: 0.98, duration: 220, streamUrl: '/stream' },
        ];
        const result = await recommendation.recommendTracks({ mood: 'happy' }, null,
            { regionPreference: 'Indian + International', languagePreference: 'Mixed' }, 8, { currentMood: 'happy', desiredMood: 'happy' });
        const indianCount = result.tracks.filter((track) => track.source === 'jiosaavn').length;
        const internationalCount = result.tracks.filter((track) => track.source === 'audius').length;
        assert.equal(result.tracks.length, 8);
        assert.equal(indianCount, 5);
        assert.equal(internationalCount, 3);
        assert(indianCount >= 4);
    } finally {
        indian.getMoodTracks = originalIndian;
        audius.getMoodTracks = originalAudius;
    }
});

test('Indian Hindi preference is a hard language filter; mixed language is not a requested language', async () => {
    const originalIndian = indian.getMoodTracks;
    try {
        indian.getMoodTracks = async () => [
            ...Array.from({ length: 6 }, (_, i) => qualifiedTrack(`hindi-${i}`, 'happy', 'jiosaavn', 'Hindi')),
            ...Array.from({ length: 6 }, (_, i) => qualifiedTrack(`tamil-${i}`, 'happy', 'jiosaavn', 'Tamil')),
        ];
        const hindi = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'Hindi' }, 8);
        assert(hindi.tracks.length > 0);
        assert(hindi.tracks.every((track) => track.language === 'Hindi'));
        const mixed = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'Mixed' }, 8);
        assert(mixed.tracks.some((track) => track.language === 'Hindi'));
        assert(mixed.tracks.some((track) => track.language === 'Tamil'));
    } finally {
        indian.getMoodTracks = originalIndian;
    }
});

test('duplicate track versions collapse to a title-and-artist identity', () => {
    const unique = recommendation.dedupeTracks([
        { id: 'one', title: 'Naina Da Kya Kasoor', artist: 'Amit Trivedi' },
        { id: 'two', title: 'Naina Da Kya Kasoor (From a Film)', artist: 'Amit Trivedi' },
        { id: 'three', title: 'Naina Da Kya Kasoor - Title Track', artist: 'Amit Trivedi' },
    ]);
    assert.equal(unique.length, 1);
});

test('repeated recommendations choose a different qualified playlist from a broad candidate pool', async () => {
    const originalIndian = indian.getMoodTracks;
    try {
        indian.getMoodTracks = async () => Array.from({ length: 40 }, (_, i) => qualifiedTrack(`fresh-${i}`, 'happy'));
        const first = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'All' }, 8);
        const second = await recommendation.recommendTracks({ mood: 'happy' }, null, { region: 'Indian', language: 'All' }, 8);
        const firstIds = new Set(first.tracks.map((track) => track.id));
        assert(first.tracks.every((track) => track.tags.some((tag) => moodTags.happy.includes(tag))));
        assert(second.tracks.every((track) => track.tags.some((tag) => moodTags.happy.includes(tag))));
        assert(second.tracks.some((track) => !firstIds.has(track.id)));
    } finally {
        indian.getMoodTracks = originalIndian;
    }
});
