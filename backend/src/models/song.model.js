const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    posterUrl: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    mood: {
        type: String,
        enum : ['happy', 'sad', 'angry', 'relaxed', 'neutral', 'surprised', 'anxious', 'energetic', 'Happy', 'Sad', 'Surprised', 'Calm'],
        message: 'Enum this is ',
    },
    artist: String,
    duration: Number,
    genre: String,
    tags: [String],
    language: String,
})

const SongModel = mongoose.model('Song', songSchema);

module.exports = SongModel;