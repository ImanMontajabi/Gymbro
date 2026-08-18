import { useEffect, useState } from 'react'
import { loadRestSoundPreference, saveRestSoundPreference } from '../utils/audio'

// Which alarm mp3 plays when the rest timer ends, persisted to localStorage.
// `audioRef` is the shared <audio> element rendered in App.jsx — merely
// changing its `src` attribute doesn't reliably reload the resource in
// every browser, so `.load()` is forced explicitly whenever the selection
// changes.
export function useRestSound(audioRef) {
  const [restSound, setRestSoundState] = useState(loadRestSoundPreference)

  useEffect(() => {
    audioRef.current?.load()
  }, [restSound])

  function setRestSound(sound) {
    setRestSoundState(sound)
    saveRestSoundPreference(sound)
  }

  return { restSound, setRestSound }
}
