import { useEffect, useRef } from 'react'

// Keeps the screen from sleeping for the duration of an active workout via
// the Screen Wake Lock API. The OS releases the lock automatically whenever
// the tab is hidden (backgrounded, screen locked, app-switched away), so a
// visibilitychange listener re-acquires it the moment the tab becomes
// visible again while a workout is still active — otherwise coming back
// from the app switcher mid-workout would silently leave the screen
// unprotected. Unsupported browsers (no `navigator.wakeLock`) just no-op.
export function useWakeLock(isActive) {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    if (!isActive || !('wakeLock' in navigator)) return

    let cancelled = false

    async function requestLock() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        wakeLockRef.current = lock
      } catch (error) {
        console.log('Wake lock request failed:', error)
      }
    }

    requestLock()

    // Always re-request on becoming visible rather than checking whether we
    // still think we hold a lock — the lock the browser silently released
    // when the tab was hidden is indistinguishable from a live one just by
    // looking at our ref.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') requestLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [isActive])
}
