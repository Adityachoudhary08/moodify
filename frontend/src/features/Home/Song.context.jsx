import { useEffect, useState } from 'react'
import { SongContext } from './SongContext'

export const SongContextProvider = ({ children }) => {
    const [currentSong, setcurrentSong] = useState(null)
    const [shouldAutoplay, setShouldAutoplay] = useState(false)
    const [pauseRequest, setPauseRequest] = useState(0)
    const [playRequest, setPlayRequest] = useState(0)
    const [restartRequest, setRestartRequest] = useState(0)
    const [playlist, setplaylist] = useState([])

    const [currentMood, setcurrentMood] = useState(null)
    const [currentProfile, setCurrentProfile] = useState(null)
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('moodify-language')
        return saved || 'DefaultIndianMix'
    })
    const [region, setRegion] = useState(() => {
        const saved = localStorage.getItem('moodify-region')
        return saved || 'Indian'
    })
    const [lastDesiredMood, setLastDesiredMood] = useState(null)
    const [providers, setProviders] = useState({ indian: 'pending', international: 'pending' })
    const [songError, setSongError] = useState('')
    const [loading, setloading] = useState(false)

    useEffect(() => {
        localStorage.setItem('moodify-language', language)
    }, [language])

    useEffect(() => {
        localStorage.setItem('moodify-region', region)
    }, [region])

    return (
        <SongContext.Provider value={{ currentSong, setcurrentSong, shouldAutoplay, setShouldAutoplay, pauseRequest, setPauseRequest, playRequest, setPlayRequest, restartRequest, setRestartRequest, playlist, setplaylist, currentMood, setcurrentMood, currentProfile, setCurrentProfile, language, setLanguage, region, setRegion, lastDesiredMood, setLastDesiredMood, providers, setProviders, songError, setSongError, loading, setloading }}>
            {children}
        </SongContext.Provider>
    )
}
