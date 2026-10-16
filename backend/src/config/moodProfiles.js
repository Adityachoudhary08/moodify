const moodProfiles = {
    happy: {
        title: 'Happy feels like this',
        subtitle: 'Keep the good feeling going',
        emoji: '\ud83d\ude0a',
        musicTags: ['happy', 'upbeat', 'feel-good', 'uplifting'],
        genres: ['pop', 'dance', 'indie'],
        playlistDescription: 'Upbeat and feel-good tracks for a bright moment.',
        activities: [
            { title: 'Share your win', text: 'Send someone a quick message about one small thing that made you smile today.', duration: '2 min', difficulty: 'Easy' },
            { title: 'Make a joy playlist', text: 'Add three songs that always make you want to move, sing, or smile.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Save a bright moment', text: 'Write one sentence about today that you will be glad to remember.', duration: '3 min', difficulty: 'Easy' },
        ],
    },
    sad: {
        title: 'Sad feels like this',
        subtitle: 'A gentle lift for this moment',
        emoji: '\ud83d\ude22',
        musicTags: ['emotional', 'melancholic', 'acoustic', 'calm'],
        genres: ['acoustic', 'singer-songwriter', 'ambient'],
        playlistDescription: 'Reflective tracks with a little room to breathe.',
        activities: [
            { title: 'Try a tiny reset', text: 'Stretch your shoulders, take a sip of water, and tell one silly joke out loud.', duration: '2 min', difficulty: 'Easy' },
            { title: 'Find your funniest meme', text: 'Send a meme to someone who gets your sense of humor, even if it only earns one laugh.', duration: '3 min', difficulty: 'Easy' },
            { title: 'Make the next minute softer', text: 'Open a window, move somewhere brighter, or take a short walk.', duration: '5 min', difficulty: 'Easy' },
        ],
    },
    angry: {
        title: 'Angry feels like this',
        subtitle: 'Make space before your next move',
        emoji: '\ud83d\ude24',
        musicTags: ['powerful', 'intense', 'energetic'],
        genres: ['rock', 'hip-hop', 'electronic'],
        playlistDescription: 'Strong, driving tracks to help you move through the moment.',
        activities: [
            { title: 'Take a short walk', text: 'Move for five minutes before deciding what needs your attention.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Write it without sending', text: 'Write what is bothering you exactly as it is, then leave it unsent.', duration: '4 min', difficulty: 'Easy' },
            { title: 'Release the tension', text: 'Stretch your shoulders, hands, and jaw while taking slow breaths.', duration: '3 min', difficulty: 'Easy' },
        ],
    },
    relaxed: {
        title: 'Relaxed feels like this',
        subtitle: 'Protect this quiet feeling',
        emoji: '\ud83d\ude0c',
        musicTags: ['chill', 'calm', 'ambient', 'acoustic'],
        genres: ['ambient', 'acoustic', 'classical'],
        playlistDescription: 'Soft, spacious tracks for a slower pace.',
        activities: [
            { title: 'Take three slow breaths', text: 'Inhale for four counts, exhale for six, and notice what feels steady around you.', duration: '2 min', difficulty: 'Easy' },
            { title: 'Take a screen break', text: 'Put your phone down for five minutes and notice the sounds around you.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Use the stillness', text: 'Tidy one surface or write down one thought that has been taking up space.', duration: '4 min', difficulty: 'Easy' },
        ],
    },
    neutral: {
        title: 'Neutral feels like this',
        subtitle: 'Let discovery choose the direction',
        emoji: '\ud83d\ude10',
        musicTags: ['chill', 'easy-listening', 'acoustic', 'discovery'],
        genres: ['indie', 'acoustic', 'pop'],
        playlistDescription: 'Easy-listening discoveries with a little variety.',
        activities: [
            { title: 'Discover something new', text: 'Choose one song, idea, or place you have not tried before.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Take a short walk', text: 'Walk without a destination and notice one detail you usually miss.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Make a small creative choice', text: 'Sketch, rearrange a shelf, or write a sentence just for yourself.', duration: '4 min', difficulty: 'Easy' },
        ],
    },
    surprised: {
        title: 'Surprised feels like this',
        subtitle: 'Turn the moment into curiosity',
        emoji: '\ud83d\ude32',
        musicTags: ['energetic', 'playful', 'upbeat'],
        genres: ['electronic', 'pop', 'dance'],
        playlistDescription: 'Playful, energetic tracks for an unexpected moment.',
        activities: [
            { title: 'Make a quick meme', text: 'Caption the last unexpected thing with the most dramatic reaction you can imagine.', duration: '3 min', difficulty: 'Easy' },
            { title: 'Ask one new question', text: 'Write down one question about what surprised you, then explore it.', duration: '4 min', difficulty: 'Easy' },
            { title: 'Pause before reacting', text: 'Name what happened, what you feel, and what you need next.', duration: '2 min', difficulty: 'Easy' },
        ],
    },
    anxious: {
        title: 'Anxious feels like this',
        subtitle: 'Come back to what is here',
        emoji: '\ud83c\udf2b',
        musicTags: ['calm', 'ambient', 'soft', 'acoustic'],
        genres: ['ambient', 'classical', 'acoustic'],
        playlistDescription: 'Grounding, spacious tracks for a busy moment.',
        activities: [
            { title: 'Name five things', text: 'Notice five things you can see, four you can feel, and three you can hear.', duration: '3 min', difficulty: 'Easy' },
            { title: 'Make the next step tiny', text: 'Choose one action that takes less than two minutes and do only that.', duration: '2 min', difficulty: 'Easy' },
            { title: 'Reach out simply', text: 'Message someone safe: "I am having a busy moment. Can you check in?"', duration: '2 min', difficulty: 'Easy' },
        ],
    },
    energetic: {
        title: 'Energetic feels like this',
        subtitle: 'Give the energy somewhere to go',
        emoji: '\u26a1',
        musicTags: ['energetic', 'upbeat', 'dance', 'workout'],
        genres: ['dance', 'electronic', 'hip-hop'],
        playlistDescription: 'High-energy tracks for movement and momentum.',
        activities: [
            { title: 'Move to one song', text: 'Put on a favorite track and let your body choose the movement.', duration: '4 min', difficulty: 'Easy' },
            { title: 'Try a quick challenge', text: 'Set a five-minute timer and make, tidy, or solve one small thing.', duration: '5 min', difficulty: 'Easy' },
            { title: 'Send the energy outward', text: 'Invite someone to do something simple with you today.', duration: '2 min', difficulty: 'Easy' },
        ],
    },
};

const moodAliases = {
    joy: 'happy',
    happy: 'happy',
    sorrow: 'sad',
    sad: 'sad',
    depressed: 'sad',
    angry: 'angry',
    mad: 'angry',
    calm: 'relaxed',
    relaxed: 'relaxed',
    neutral: 'neutral',
    surprised: 'surprised',
    surprise: 'surprised',
    shocked: 'surprised',
    shock: 'surprised',
    anxious: 'anxious',
    worried: 'anxious',
    energetic: 'energetic',
    funky: 'energetic',
    romantic: 'happy',
    chill: 'relaxed',
    confident: 'energetic',
    motivated: 'energetic',
    focused: 'neutral',
};

function normalizeMood(value) {
    return moodAliases[String(value || '').trim().toLowerCase()] || null;
}

function getMoodProfile(value) {
    const mood = normalizeMood(value);
    return mood ? { mood, ...moodProfiles[mood] } : null;
}

module.exports = { moodProfiles, normalizeMood, getMoodProfile };
