import { useEffect, useState } from 'react'

// Tracks browser connectivity via the `online`/`offline` window events.
// Purely presentational — it doesn't touch the mutation queue itself, so it
// can be used anywhere the offline badge is needed without pulling in sync
// logic. See useMutationQueue for the actual offline-write handling.
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
