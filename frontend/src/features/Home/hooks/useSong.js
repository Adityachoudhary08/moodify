import { getSong } from '../service/song.api'
import { useCallback, useContext } from 'react'
import { SongContext } from '../SongContext'

function uniqueSongs(songs = []) {
    const seen = new Set()
    return songs.filter((song) => {
        const id = song.id || song._id
        const title = String(song.title || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
        const artist = String(song.artist || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
        const key = id ? `id:${id}` : `${title}|${artist}`
        if (!title || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

const songIds = (songs = []) => new Set(songs.map((song) => song.id || song._id).filter(Boolean).map(String))

export const useSong = () => {
    const context = useContext(SongContext)
    const {
        currentSong, setcurrentSong, shouldAutoplay, setShouldAutoplay, playlist, setplaylist, currentMood, setcurrentMood,
        currentProfile, setCurrentProfile, language, setLanguage, region, setRegion,
        songError, setSongError, loading, setloading, lastDesiredMood, setLastDesiredMood,
        providers, setProviders, pauseRequest, setPauseRequest, playRequest, setPlayRequest, setRestartRequest,
    } = context
    const pausePlayback = useCallback(() => setPauseRequest((value) => value + 1), [setPauseRequest])
    const resumePlayback = useCallback(() => setPlayRequest((value) => value + 1), [setPlayRequest])

    async function handleGetSong({ mood, desiredMood = mood, selectedLanguage = language, selectedRegion = region }) {
        setloading(true)
        setShouldAutoplay(false)
        setSongError('')
        setLastDesiredMood(desiredMood || mood)

        try {
            const data = await getSong({ mood, desiredMood: desiredMood || mood, language: selectedLanguage, region: selectedRegion })
            const playlistData = uniqueSongs(Array.isArray(data?.playlist) ? data.playlist : [])
            setplaylist(playlistData)
            setcurrentSong(playlistData.length ? data.currentSong || playlistData[0] : null)
            setcurrentMood(mood)
            setCurrentProfile(data?.profile || null)
            setProviders(data?.providers || { indian: 'not-reported', international: 'not-reported' })
            setSongError(data?.success === false || data?.error
                ? data.message || data.error
                : playlistData.length === 0 ? 'No strong matches for this vibe yet.' : '')
            return playlistData
        } catch (error) {
            setplaylist([])
            setcurrentSong(null)
            setcurrentMood(mood)
            setCurrentProfile(null)
            setProviders(error.payload?.providers || { indian: 'unavailable', international: 'unavailable' })
            setSongError(error.message || `Could not load the ${mood} playlist.`)
            return []
        } finally {
            setloading(false)
        }
    }

    async function refreshPlaylist() {
        if (!currentMood) return []
        const desiredMood = lastDesiredMood || currentMood
        const previousIds = songIds(playlist)
        const previousKeys = new Set(playlist.map((song) => {
            const title = String(song.title || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
            const artist = String(song.artist || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
            return `${title}|${artist}`
        }))
        setloading(true)
        setShouldAutoplay(false)
        setSongError('')
        setLastDesiredMood(desiredMood)

        try {
            let bestData = null
            let bestSongs = []
            let bestFreshCount = -1
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const data = await getSong({ mood: currentMood, desiredMood, language, region })
                const candidates = uniqueSongs(Array.isArray(data?.playlist) ? data.playlist : [])
                const freshSongs = candidates.filter((song) => {
                    const id = song.id || song._id
                    const title = String(song.title || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
                    const artist = String(song.artist || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
                    return !(id && previousIds.has(String(id))) && !previousKeys.has(`${title}|${artist}`)
                })
                if (freshSongs.length > bestFreshCount) {
                    bestData = data
                    bestSongs = freshSongs
                    bestFreshCount = freshSongs.length
                }
                if (freshSongs.length >= Math.min(5, candidates.length)) break
            }

            setplaylist(bestSongs)
            setcurrentSong(bestSongs.length ? bestSongs[0] : null)
            setCurrentProfile(bestData?.profile || currentProfile)
            setProviders(bestData?.providers || providers)
            setSongError(bestSongs.length ? '' : 'No new strong matches for this vibe yet. Try again in a moment.')
            return bestSongs
        } catch (error) {
            setplaylist([])
            setcurrentSong(null)
            setProviders(error.payload?.providers || { indian: 'unavailable', international: 'unavailable' })
            setSongError(error.message || 'Could not find another mix right now.')
            return []
        } finally {
            setloading(false)
        }
    }

    function playNextSong() {
        if (!playlist?.length) return
        const currentIndex = playlist.findIndex((song) => (song.id || song._id) === (currentSong?.id || currentSong?._id))
        if (currentIndex < playlist.length - 1) {
            setcurrentSong(playlist[currentIndex + 1])
            setShouldAutoplay(true)
        }
    }

    function playPreviousSong() {
        if (!playlist?.length) return
        const currentIndex = playlist.findIndex((song) => (song.id || song._id) === (currentSong?.id || currentSong?._id))
        if (currentIndex > 0) {
            setcurrentSong(playlist[currentIndex - 1])
            setShouldAutoplay(true)
        }
    }

    function playSongAtIndex(index) {
        if (playlist?.[index]) {
            setcurrentSong(playlist[index])
            setShouldAutoplay(true)
            setRestartRequest((value) => value + 1)
        }
    }

    return {
        handleGetSong, refreshPlaylist, currentSong, playlist, loading, currentMood, currentProfile, shouldAutoplay, setShouldAutoplay,
        language, setLanguage, region, setRegion, songError, playNextSong, playPreviousSong, playSongAtIndex,
        providers,
        pausePlayback,
        pauseRequest,
        resumePlayback,
        playRequest,
        restartRequest: context.restartRequest,
    }
}
