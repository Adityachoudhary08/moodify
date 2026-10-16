const songModel = require('../models/song.model');
const id3 = require('node-id3');
const storageService = require('../service/storage.service');
const { getMoodProfile } = require('../config/moodProfiles');
const { recommendTracks } = require('../service/recommendation.service');

async function uploadSong(req, res) {
    const songBuffer = req.file.buffer;
    const profile = getMoodProfile(req.body.mood);
    const language = req.body.language || null;

    if (!profile) {
        return res.status(400).json({ message: 'A valid mood is required' });
    }

    const tags = id3.read(songBuffer);

    const [songFile, posterFile] = await Promise.all([
        storageService.uploadFile({
            buffer: songBuffer,
            filename: tags.title + ".mp3",
            folder: "backend/moodify/songs",
        }),
        storageService.uploadFile({
            buffer: tags.image.imageBuffer,
            filename: tags.title + ".jpeg",
            folder: "backend/moodify/posters",
        })
    ]);

    const song = await songModel.create({
        url: songFile.url,
        posterUrl: posterFile.url,
        title: tags.title,
        mood: profile.mood,
        language,
    })

    res.status(201).json({
        message: "Song uploaded successfully",
        song,
    });
}

async function getSongs(req, res) {
    const currentMood = req.query.currentMood || req.query.mood;
    const profile = getMoodProfile(currentMood);
    const desiredMood = req.query.desiredMood || currentMood;
    const desiredProfile = getMoodProfile(desiredMood);
    const requestedDesiredMood = String(req.query.desiredMood || '').trim().toLowerCase();
    const recommendationMood = ['happy', 'sad', 'energetic', 'chill', 'romantic', 'confident', 'motivated', 'calm', 'relaxed'].includes(requestedDesiredMood)
        ? requestedDesiredMood
        : desiredProfile?.mood;
    const preferences = {
        language: req.query.languagePreference || req.query.language || 'All',
        region: req.query.regionPreference || req.query.region || 'Mix',
    };

    console.info('Incoming request:', JSON.stringify({
        mood: currentMood,
        desiredMood,
        language: preferences.language,
        region: preferences.region,
    }));

    if (!profile) {
        return res.status(400).json({
            message: 'A valid mood is required',
            playlist: [],
            currentSong: null,
        });
    }

    const recommendationProfile = desiredProfile
        ? {
            ...profile,
            musicTags: [...new Set([...profile.musicTags, ...desiredProfile.musicTags])],
            genres: [...new Set([...profile.genres, ...desiredProfile.genres])],
        }
        : profile;
    const recommendation = await recommendTracks(recommendationProfile, songModel, preferences, 8, {
        currentMood: profile.mood,
        desiredMood: recommendationMood || profile.mood,
    });
    const songs = recommendation.tracks;

    if (recommendation.error === 'INDIAN_PROVIDER_UNAVAILABLE') {
        return res.status(503).json({
            success: false,
            message: 'Indian music temporarily unavailable',
            error: 'Indian music provider temporarily unavailable',
            meta: {
                providerStatus: 'unavailable',
                region: recommendation.requestedRegion,
                mood: currentMood,
                desiredMood: recommendationMood || currentMood
            },
            songs: [],
            playlist: [],
            currentSong: null,
        });
    }

    if (recommendation.error === 'MUSIC_PROVIDERS_UNAVAILABLE') {
        return res.status(503).json({
            success: false,
            message: 'Music providers are temporarily unavailable',
            error: 'Music providers temporarily unavailable',
            meta: {
                providerStatus: 'unavailable',
                region: recommendation.requestedRegion,
                mood: currentMood,
                desiredMood: recommendationMood || currentMood
            },
            songs: [],
            playlist: [],
            currentSong: null,
        });
    }
    
    // For NO_STRONG_MATCHES or other filtering issues, return 200 with empty list
    res.status(200).json({
        success: true,
        message: songs.length ? "Playlist fetched successfully" : "No strong matches found for this vibe",
        mood: profile.mood,
        desiredMood: desiredProfile?.mood || profile.mood,
        preferences,
        meta: recommendation.meta || {
            region: recommendation.requestedRegion,
            mood: currentMood,
            desiredMood: desiredProfile?.mood || currentMood,
            provider: recommendation.selectedProvider,
            fallbackUsed: recommendation.fallbackTriggered
        },
        songs,
        providers: recommendation.providers,
        playlist: songs,
        currentSong: songs[0] || null,
    });
}

module.exports = {
    uploadSong,
    getSongs
};
