const { getMusicProvider, normalizeRequestedRegion, filterTracksForRegion, isIndianLanguage } = require('./musicProvider');
const indianMusicService = require('./indianMusic.service');
const audiusService = require('./audius.service');

// ── Removed MIN_RECOMMENDATION_SCORE hard gate ──
// Songs are now ranked by score, not filtered by threshold.

function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
}

function normalizeLocalSong(song) {
    return {
        id: song._id?.toString() || song.id,
        title: song.title,
        artist: song.artist || 'Moodify library',
        artwork: song.posterUrl,
        duration: Number(song.duration) || 0,
        streamUrl: song.url,
        source: 'moodify-library',
        region: isIndianLanguage(song.language) ? 'Indian' : song.language ? 'International' : null,
        regionConfidence: song.language ? 0.95 : 0.35,
        genre: song.genre || null,
        tags: song.tags || [],
        language: song.language || null,
        mood: song.mood,
        permalink: null,
    };
}

function normalizePart(value) {
    return String(value || '').toLocaleLowerCase()
        .replace(/\s*\((?:from|remaster|remastered|version|lyrics?|audio|video)[^)]*\)/gi, '')
        .replace(/\s*[-–:]\s*(?:from\s+.+|title track|remaster(?:ed)?|lyrics?|audio|video)$/i, '')
        .replace(/\b(remaster(?:ed)?|remix|version|lyrics?|audio|video|official)\b/gi, '')
        .replace(/[^\p{L}\p{N}]/gu, '');
}

function createDeduplicationKey(track) {
    const title = normalizePart(track.title);
    const artist = normalizePart(String(track.artist || '').split(/,|&|\bfeat\.?\b|\bft\.?\b/i)[0]);
    return `${title}|${artist}`;
}

function dedupeTracks(tracks) {
    const ids = new Set();
    const keys = new Set();
    return tracks.filter((track) => {
        if (!track.id || !normalizePart(track.title)) return false;
        const key = createDeduplicationKey(track);
        if (ids.has(String(track.id)) || keys.has(key)) return false;
        ids.add(String(track.id));
        keys.add(key);
        return true;
    });
}

function normalizeLanguage(language) {
    const value = String(language || '').trim().toLowerCase();
    const aliases = { hi: 'hindi', hin: 'hindi', pa: 'punjabi', pan: 'punjabi', ta: 'tamil', tam: 'tamil', te: 'telugu', tel: 'telugu', bn: 'bengali', ben: 'bengali', mr: 'marathi', mar: 'marathi', gu: 'gujarati', guj: 'gujarati', ml: 'malayalam', mal: 'malayalam', kn: 'kannada', kan: 'kannada', en: 'english' };
    return aliases[value] || value;
}

// ── Language Preference Normalization ──
// "Mixed" for Indian region means "DefaultIndianMix" (weighted Hindi/Punjabi).
// Do NOT treat it as "All languages equally".
function normalizeLanguagePreference(language, region) {
    const value = String(language || '').trim().toLowerCase();
    const normalizedRegion = String(region || '').trim().toLowerCase();

    // If region is Indian and language is Mixed/All/unset, use DefaultIndianMix
    if (['indian'].includes(normalizedRegion)) {
        if (!value || ['all', 'mixed', 'any', 'indian', 'defaultindianmix'].includes(value)) {
            return 'DefaultIndianMix';
        }
    }

    // For Mix region, also use DefaultIndianMix for the Indian portion
    if (['mix', 'mixed'].includes(normalizedRegion)) {
        if (!value || ['all', 'mixed', 'any', 'indian'].includes(value)) {
            return 'DefaultIndianMix';
        }
    }

    if (['all', 'mixed', 'any'].includes(value)) return 'All';
    return String(language).trim();
}

function languageMatches(track, preference) {
    if (!preference || ['all', 'mixed', 'any', 'defaultindianmix'].includes(String(preference).toLowerCase())) return true;
    if (!track.language) return false;
    return normalizeLanguage(track.language) === normalizeLanguage(preference);
}

// ── Score Candidate ──
// IMPORTANT: This function now uses mood scoring for RANKING, not gating.
// A song is only rejected when there is strong contradictory evidence.
function scoreCandidate(track, currentMood, desiredMood, languagePreference) {
    const result = indianMusicService.scoreTrack(track, currentMood, desiredMood, languagePreference);
    const mood = result.moodBreakdown;

    // Only hard-reject when there is a clear rejection reason from the score function
    // (contradictory mood, non-music content, non-Indian, etc.)
    // Do NOT reject for "insufficient independent mood evidence"
    const rejectionReason = result.reason || null;

    return {
        score: result.score,
        moodScore: result.moodScore,
        desiredMoodScore: result.desiredMoodBreakdown?.score || 0,
        currentMoodScore: currentMood === desiredMood ? result.moodScore : indianMusicService.calculateMoodScore(track, currentMood).score,
        negativeScore: mood?.negativeScore || 0,
        qualityScore: result.qualityScore,
        rejectionReason,
        breakdown: result,
    };
}

// ── Rank Candidates ──
// Scores and sorts all candidates. Only hard-rejects clearly incompatible songs.
function rankCandidates(tracks, currentMood, desiredMood, languagePreference) {
    const scored = [];
    const rejected = [];
    for (const track of tracks) {
        const score = scoreCandidate(track, currentMood, desiredMood, languagePreference);
        if (score.rejectionReason) rejected.push({ track, ...score });
        else scored.push({ track, ...score });
    }
    scored.sort((a, b) => b.score - a.score || b.moodScore - a.moodScore);
    return { scored, rejected };
}

// ── Progressive Relaxation for Ranking ──
// If strict ranking produces too few results, progressively relax criteria.
function rankWithRelaxation(tracks, currentMood, desiredMood, languagePreference, targetCount = 8) {
    // Stage 1: Normal ranking (reject only clearly incompatible)
    const { scored, rejected } = rankCandidates(tracks, currentMood, desiredMood, languagePreference);
    let relaxationStage = 'strict';

    if (scored.length >= targetCount) {
        return { scored, rejected, relaxationStage };
    }

    // Stage 2: Re-evaluate rejected tracks with more lenient criteria
    // Only keep rejections for truly non-music content or hard contradictions
    relaxationStage = 'relaxed';
    const reEvaluated = [];
    const stillRejected = [];

    for (const item of rejected) {
        const reason = item.rejectionReason || '';
        // Keep hard rejections for:
        // - non-Indian content
        // - non-music content (meditation, devotional, etc.)
        // - genuinely unplayable
        // - strong mood contradictions
        if (reason.includes('non-Indian') || reason.includes('non-song content') || reason.includes('not a playable song') || reason.includes('contradict') || item.negativeScore >= 24) {
            stillRejected.push(item);
        } else {
            // Relax: allow tracks with weak evidence (but not strong contradictions)
            reEvaluated.push(item);
        }
    }

    const combined = [...scored, ...reEvaluated];
    combined.sort((a, b) => b.score - a.score || b.moodScore - a.moodScore);

    if (combined.length >= targetCount) {
        return { scored: combined, rejected: stillRejected, relaxationStage };
    }

    // Stage 3: Accept everything that has a stream URL and is a valid song (except contradictions)
    relaxationStage = 'very-relaxed';
    const allUsable = [...combined, ...stillRejected.filter((item) => {
        const track = item.track;
        const reason = item.rejectionReason || '';
        const isContradiction = reason.includes('contradict') || item.negativeScore >= 24;
        return track.streamUrl && Number(track.duration) >= 60 && !isContradiction;
    })];
    allUsable.sort((a, b) => b.score - a.score || b.moodScore - a.moodScore);

    return { scored: allUsable, rejected: stillRejected.filter((item) => !allUsable.includes(item)), relaxationStage };
}

function phaseOf(item, currentMood, desiredMood) {
    if (currentMood === desiredMood) return 'destination';
    const { track, currentMoodScore, desiredMoodScore } = item;
    const metrics = track._recommendation || {};
    const currentScore = Number(metrics.currentMoodScore) || currentMoodScore
        || indianMusicService.calculateMoodScore(track, currentMood).score;
    const desiredScore = Number(metrics.desiredMoodScore) || desiredMoodScore
        || indianMusicService.calculateMoodScore(track, desiredMood).score;
    if (currentScore >= desiredScore + 10 && currentScore >= 20) return 'opening';
    if (desiredScore >= currentScore + 10) return 'destination';
    return 'bridge';
}

// ── Mood Transition Selection ──
// For transitions (currentMood !== desiredMood), arrange tracks in a progression:
// Tracks 1-2: closer to currentMood (opening)
// Tracks 3-5: bridge/transitional
// Tracks 6-8: closer to desiredMood (destination)
function controlledSelection(ranked, count, currentMood, desiredMood) {
    if (!ranked.length || count <= 0) return [];
    const topPool = shuffle(ranked.slice(0, Math.min(40, ranked.length)));
    const selected = [];
    const languageCounts = new Map();
    const artistCounts = new Map();
    const albumCounts = new Map();
    const add = (item, enforceDiversity) => {
        if (selected.length >= count || selected.some(({ track }) => track.id === item.track.id)) return false;
        const language = normalizeLanguage(item.track.language) || 'unknown';
        const artist = normalizePart(String(item.track.artist || '').split(/,|&|\bfeat\.?\b|\bft\.?\b/i)[0]);
        const album = normalizePart(item.track._albumName || item.track.album || '');
        if (enforceDiversity && ((languageCounts.get(language) || 0) >= 4
            || (artistCounts.get(artist) || 0) >= 3
            || (album && (albumCounts.get(album) || 0) >= 3))) return false;
        selected.push(item);
        languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
        if (album) albumCounts.set(album, (albumCounts.get(album) || 0) + 1);
        return true;
    };

    if (currentMood !== desiredMood) {
        const opening = topPool.filter((item) => phaseOf(item, currentMood, desiredMood) === 'opening');
        const bridges = topPool.filter((item) => phaseOf(item, currentMood, desiredMood) === 'bridge');
        const destination = topPool.filter((item) => phaseOf(item, currentMood, desiredMood) === 'destination');
        const openingQuota = Math.min(Math.ceil(count * 0.25), opening.length, 2);
        for (const item of opening) {
            if (selected.filter((candidate) => phaseOf(candidate, currentMood, desiredMood) === 'opening').length >= openingQuota) break;
            add(item, true);
        }
        for (const item of [...bridges, ...destination]) add(item, true);
    } else {
        for (const item of topPool) add(item, true);
    }

    // Diversity is only a soft constraint: never trade relevance for a cap.
    // In a transition, don't pad the destination with more opening-phase songs.
    if (currentMood === desiredMood) {
        for (const item of topPool) add(item, false);
    } else {
        for (const item of [...topPool.filter((candidate) => phaseOf(candidate, currentMood, desiredMood) === 'bridge'),
            ...topPool.filter((candidate) => phaseOf(candidate, currentMood, desiredMood) === 'destination')]) add(item, false);
    }
    return selected.map(({ track }) => track);
}

function selectMix(indian, international, count, currentMood, desiredMood) {
    const indianQuota = Math.ceil(count * 0.6);
    const internationalQuota = count - indianQuota;
    const selectedIndian = controlledSelection(indian, indianQuota, currentMood, desiredMood);
    const selectedInternational = controlledSelection(international, internationalQuota, currentMood, desiredMood);
    const selected = [];
    let i = 0;
    let j = 0;
    while (i < selectedIndian.length || j < selectedInternational.length) {
        if (i < selectedIndian.length) selected.push(selectedIndian[i++]);
        if (j < selectedInternational.length) selected.push(selectedInternational[j++]);
    }
    if (selected.length < count) {
        const used = new Set(selected.map((track) => track.id));
        const extras = [...indian, ...international].filter(({ track }) => !used.has(track.id));
        for (const { track } of extras) {
            if (selected.length >= count) break;
            selected.push(track);
        }
    }
    return selected;
}

function stripInternalFields(tracks) {
    return tracks.map((track) => {
        const { regionConfidence, languageConfidence, regionReason, _providerLanguage, _albumLanguage, _detectedLanguage, _contentType, _albumName, _collectionName, _artistMetadata, _tempo, _instrumental, _recommendation, _matchedMoods, _matchedBridges, _popularity, ...song } = track;
        return song;
    });
}

function logMusicRequest(debug) {
    console.info('=== MOODIFY MUSIC REQUEST ===');
    for (const key of ['requestedRegion', 'requestedLanguage', 'currentMood', 'desiredMood', 'moodTransition', 'selectedProvider',
        'providerStatus', 'rawCandidateCount', 'regionAccepted', 'regionRejected', 'languageAccepted', 'languageRejected',
        'moodScored', 'moodAccepted', 'negativeRejected', 'qualityRejected', 'duplicatesRemoved',
        'relaxationStage', 'finalCandidateCount']) {
        if (debug[key] !== undefined) console.info(`${key}: ${debug[key]}`);
    }
    if (debug.finalLanguageDistribution) {
        console.info(`finalLanguageDistribution: ${JSON.stringify(debug.finalLanguageDistribution)}`);
    }
    if (debug.rejectedCandidates?.length) console.info(`rejectedCandidates: ${JSON.stringify(debug.rejectedCandidates.slice(0, 30))}`);
    console.info(`finalSongs: ${JSON.stringify(debug.finalSongs)}`);
    console.info('==============================');
}

async function recommendTracks(profile, songModel, preferences = {}, limit = 8, transition = {}) {
    const rawRegion = preferences.regionPreference || preferences.region;
    const rawLanguage = preferences.languagePreference || preferences.language;
    const requestedRegion = normalizeRequestedRegion(rawRegion, rawLanguage);
    const requestedLanguage = normalizeLanguagePreference(rawLanguage, requestedRegion);
    const providerConfig = getMusicProvider(requestedRegion, requestedLanguage);
    const currentMood = transition.currentMood || profile.mood;
    const desiredMood = transition.desiredMood || profile.mood;
    const isIndianRequest = requestedRegion === 'Indian';
    const isMixRequest = requestedRegion === 'Mix';
    const providers = { indian: isIndianRequest || isMixRequest ? 'pending' : 'not-requested', international: isIndianRequest ? 'not-requested' : 'pending' };
    const indianProvider = isIndianRequest || isMixRequest ? getMusicProvider('Indian', requestedLanguage).service : null;
    const internationalProvider = !isIndianRequest ? getMusicProvider('International', requestedLanguage).service : null;
    let indianRaw = [];
    let internationalRaw = [];
    let indianSucceeded = !isIndianRequest && !isMixRequest;
    let internationalSucceeded = isIndianRequest;
    let providerError = null;
    let indianDiagnostics = {};

    // ── Resolve language for provider ──
    // For DefaultIndianMix, pass 'All' to the provider so it searches all Indian languages,
    // but we'll apply our own weighted language balancing after retrieval.
    const providerLanguage = requestedLanguage === 'DefaultIndianMix' ? 'All' : requestedLanguage;

    const requests = [];
    if (indianProvider) requests.push(['indian', indianProvider.getCandidateTracks(profile,
        { ...preferences, language: isMixRequest ? 'All' : providerLanguage, region: 'Indian' }, 80,
        { currentMood, desiredMood, onDiagnostics: (diagnostics) => { indianDiagnostics = diagnostics; } })]);
    if (internationalProvider) requests.push(['international', internationalProvider.getMoodTracks(profile,
        { ...preferences, region: 'International' }, 80, { currentMood, desiredMood })]);
    const settled = await Promise.all(requests.map(async ([name, promise]) => {
        try { return { name, status: 'fulfilled', value: await promise }; }
        catch (error) { return { name, status: 'rejected', reason: error }; }
    }));
    for (const result of settled) {
        if (result.name === 'indian') {
            indianSucceeded = result.status === 'fulfilled';
            if (indianSucceeded) indianRaw = result.value;
            else providerError = result.reason?.message || 'Indian provider unavailable';
        } else {
            internationalSucceeded = result.status === 'fulfilled';
            if (internationalSucceeded) internationalRaw = result.value;
            else providerError = [providerError, result.reason?.message].filter(Boolean).join('; ');
        }
    }
    const raw = [...indianRaw, ...internationalRaw];
    const rawCandidateCount = raw.length;
    const regionGate = filterTracksForRegion(raw, requestedRegion);
    const regionAccepted = regionGate.accepted;
    const languageAccepted = regionAccepted.filter((track) => languageMatches(track, requestedLanguage));

    // ── Use progressive relaxation instead of hard rejection ──
    const { scored: qualified, rejected, relaxationStage } = rankWithRelaxation(
        languageAccepted, currentMood, desiredMood, requestedLanguage, limit
    );

    const negativeRejected = rejected.filter((item) => item.negativeScore >= 24 || item.rejectionReason?.includes('contradict')).length;
    const qualityRejected = rejected.filter((item) => /playable|quality|score below|song|content/i.test(item.rejectionReason || '')).length;
    const deduped = dedupeTracks(qualified.map((item) => item.track));
    const duplicatesRemoved = qualified.length - deduped.length;
    const dedupedIds = new Set(deduped.map((track) => track.id));
    const rankedIndian = qualified.filter((item) => item.track.source === 'jiosaavn' || item.track.source === 'moodify-library' && item.track.region === 'Indian')
        .filter((item) => dedupedIds.has(item.track.id));
    const rankedInternational = qualified.filter((item) => item.track.source === 'audius' || item.track.source === 'moodify-library' && item.track.region === 'International')
        .filter((item) => dedupedIds.has(item.track.id));
    providers.indian = !indianProvider ? 'not-requested' : !indianSucceeded ? 'failed' : rankedIndian.length ? 'available' : 'no-relevant-tracks';
    providers.international = !internationalProvider ? 'not-requested' : !internationalSucceeded ? 'failed' : rankedInternational.length ? 'available' : 'no-relevant-tracks';

    let localTracks = [];
    if (!qualified.length && songModel && (isIndianRequest ? indianSucceeded : isMixRequest ? indianSucceeded : internationalSucceeded)) {
        const moodNames = [...new Set([currentMood, desiredMood, currentMood === 'relaxed' ? 'Calm' : currentMood, desiredMood === 'relaxed' ? 'Calm' : desiredMood])];
        const languageFilter = requestedLanguage !== 'All' && requestedLanguage !== 'DefaultIndianMix' ? { language: requestedLanguage } : {};
        const docs = await songModel.find({ mood: { $in: moodNames }, ...languageFilter }).lean();
        localTracks = docs.map(normalizeLocalSong);
        const localGate = filterTracksForRegion(localTracks, requestedRegion);
        const localLanguage = localGate.accepted.filter((track) => languageMatches(track, requestedLanguage));
        const localRanked = rankCandidates(localLanguage, currentMood, desiredMood, requestedLanguage).scored;
        qualified.push(...localRanked);
        for (const track of localRanked.map((item) => item.track)) {
            if (requestedRegion === 'Indian' || requestedRegion === 'Mix') rankedIndian.push({ ...localRanked.find((item) => item.track.id === track.id), track });
            else rankedInternational.push({ ...localRanked.find((item) => item.track.id === track.id), track });
        }
        providers.local = localRanked.length ? 'available' : 'no-relevant-tracks';
    }

    let tracks;
    if (isMixRequest) tracks = selectMix(rankedIndian, rankedInternational, limit, currentMood, desiredMood);
    else if (isIndianRequest) tracks = controlledSelection(rankedIndian, limit, currentMood, desiredMood);
    else tracks = controlledSelection(rankedInternational, limit, currentMood, desiredMood);

    tracks = dedupeTracks(tracks);
    const finalRegion = filterTracksForRegion(tracks, requestedRegion);
    tracks = finalRegion.accepted;
    const finalCandidateCount = tracks.length;
    const fallbackTriggered = isMixRequest && !rankedIndian.length && rankedInternational.length > 0;
    const fallbackProvider = fallbackTriggered ? 'InternationalMusicProvider' : null;
    if (isMixRequest && rankedIndian.length && !rankedInternational.length) providers.international = internationalSucceeded ? 'no-relevant-tracks' : 'failed';

    // ── Compute final language distribution ──
    const finalLanguageDistribution = tracks.reduce((counts, track) => {
        const lang = normalizeLanguage(track.language) || 'unknown';
        counts[lang] = (counts[lang] || 0) + 1;
        return counts;
    }, {});

    const finalScores = new Map(qualified.map((item) => [String(item.track.id), item]));
    logMusicRequest({
        requestedRegion,
        requestedLanguage,
        currentMood,
        desiredMood,
        moodTransition: `${currentMood} -> ${desiredMood}`,
        selectedProvider: providerConfig.name,
        rawCandidateCount,
        regionAccepted: regionAccepted.length,
        languageAccepted: languageAccepted.length,
        moodScored: qualified.length + rejected.length,
        moodAccepted: qualified.length,
        negativeRejected,
        qualityRejected,
        duplicatesRemoved,
        relaxationStage,
        finalCandidateCount,
        finalLanguageDistribution,
        providerStatus: JSON.stringify(providers),
        regionRejected: regionGate.rejected.length,
        languageRejected: regionAccepted.length - languageAccepted.length,
        rejectedCandidates: [
            ...regionGate.rejected.map((track) => ({ title: track.title, artist: track.artist, language: track.language || null, region: track.region || null, rejectionReason: `region mismatch: requested ${requestedRegion}` })),
            ...regionAccepted.filter((track) => !languageAccepted.includes(track)).map((track) => ({ title: track.title, artist: track.artist, language: track.language || null, region: track.region || null, rejectionReason: `language mismatch: requested ${requestedLanguage}` })),
            ...rejected.map((item) => ({ title: item.track.title, artist: item.track.artist, language: item.track.language || null, region: item.track.region || null, moodScore: item.moodScore, desiredMoodScore: item.desiredMoodScore, negativeScore: item.negativeScore, finalScore: item.score, rejectionReason: item.rejectionReason })),
        ],
        finalSongs: tracks.map((track) => ({
            id: track.id, title: track.title, artist: track.artist, source: track.source,
            language: track.language || null, region: track.region || null,
            score: finalScores.get(String(track.id))?.score ?? null,
            moodScore: finalScores.get(String(track.id))?.moodScore ?? null,
        })),
    });

    // ── Determine error state ──
    // IMPORTANT: Do NOT use error codes that result in 503 for filtering failures.
    // Only use error codes for actual provider failures.
    let error = null;
    if (!tracks.length && isIndianRequest && !indianSucceeded) error = 'INDIAN_PROVIDER_UNAVAILABLE';
    else if (!tracks.length && !isIndianRequest && !internationalSucceeded && (!isMixRequest || !indianSucceeded)) error = 'MUSIC_PROVIDERS_UNAVAILABLE';
    else if (!tracks.length && isMixRequest && !indianSucceeded && !internationalSucceeded) error = 'MUSIC_PROVIDERS_UNAVAILABLE';
    // For the case where providers returned data but our filtering produced 0 results:
    // This should NOT be a 503. Return empty with a soft error message.
    else if (!tracks.length) error = 'NO_STRONG_MATCHES';

    return {
        tracks: stripInternalFields(tracks),
        success: tracks.length > 0,
        error,
        requestedRegion,
        selectedProvider: providerConfig.name,
        providerRegion: providerConfig.providerRegion,
        providerResultCount: rawCandidateCount,
        fallbackTriggered,
        fallbackProvider,
        finalRegion: requestedRegion,
        providers,
        candidateCount: rawCandidateCount,
        finalRegionValidation: { requestedRegion, passed: finalRegion.rejected.length === 0, acceptedCount: finalRegion.accepted.length, rejectedCount: finalRegion.rejected.length },
        providerError,
        fallbackAvailable: isIndianRequest && !indianSucceeded,
        relaxationStage,
        finalLanguageDistribution,
        meta: {
            region: requestedRegion,
            mood: currentMood,
            desiredMood,
            provider: providerConfig.name,
            fallbackUsed: fallbackTriggered,
            relaxationStage,
            languageDistribution: finalLanguageDistribution,
        },
        diagnostics: process.env.MOODIFY_RECOMMENDATION_DEBUG === 'true' ? { ...indianDiagnostics, rawCandidateCount, regionAccepted: regionAccepted.length, languageAccepted: languageAccepted.length, moodAccepted: qualified.length, negativeRejected, duplicatesRemoved, finalCandidateCount, relaxationStage, finalLanguageDistribution } : undefined,
    };
}

module.exports = { recommendTracks, dedupeTracks, filterTracksForRegion, createDeduplicationKey };
