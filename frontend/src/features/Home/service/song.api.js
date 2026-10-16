import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://moodify-6yz6.onrender.com",
    withCredentials: true,
});

export async function getSong({ mood, desiredMood, languagePreference, region, regionPreference }) {
    const requestedRegion = regionPreference || region || 'Mix'
    const regionKey = requestedRegion.trim().toLowerCase()
    const defaultLanguagePreference = ['indian', 'mix', 'mixed', 'indian + international', 'indian and international'].includes(regionKey)
        ? 'Mixed'
        : 'All'
    const requestedLanguage = languagePreference || defaultLanguagePreference
    const params = {
        mood,
        currentMood: mood,
        desiredMood,
        language: requestedLanguage,
        languagePreference: requestedLanguage,
        region: requestedRegion,
        regionPreference: requestedRegion,
    };
    console.log('GET /api/songs request params:', params);
    try {
        const response = await api.get("/api/songs", { params });
        console.log("Fetched songs for mood:", mood, response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching songs for mood:", mood, error.message, error.response?.data);
        const payload = error.response?.data;
        const requestError = new Error(payload?.message || payload?.error || 'Unable to load songs right now');
        requestError.payload = payload;
        throw requestError;
    }
}
