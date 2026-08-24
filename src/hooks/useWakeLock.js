import { useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const LOW_POWER_MESSAGE =
  'برای روشن ماندن صفحه، حالت ذخیره باتری (Low Power Mode) را خاموش کنید'

// Keeps the screen from sleeping for the duration of an active workout via
// the Screen Wake Lock API. Mobile browsers are strict about this:
// - iOS Safari drops the lock the instant the tab is backgrounded (app
//   switch, screen lock) and never restores it on its own, so a
//   visibilitychange listener re-acquires it the moment the tab becomes
//   visible again.
// - Safari/Chrome on mobile both require the request to happen inside a
//   real user gesture — an effect firing on state change is often too far
//   removed from the tap that triggered it. So this hook returns
//   `requestWakeLock`, meant to be called directly and synchronously from
//   the onClick/onSubmit handlers that start a workout or log a set, in
//   addition to the automatic acquire-on-mount/re-acquire-on-visible effect.
// - In iOS Low Power Mode the request throws NotAllowedError; that's
//   surfaced to the user once via toast rather than silently failing.
// Unsupported browsers (no `navigator.wakeLock`) just no-op throughout.
export function useWakeLock(isActive) {
  const wakeLockRef = useRef(null)
  const warnedRef = useRef(false)

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    if (wakeLockRef.current && !wakeLockRef.current.released) return

    try {
      const lock = await navigator.wakeLock.request('screen')
      wakeLockRef.current = lock
      lock.addEventListener('release', () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null
      })
    } catch (error) {
      console.log('Wake lock request failed:', error)
      if (error?.name === 'NotAllowedError' && !warnedRef.current) {
        warnedRef.current = true
        toast(LOW_POWER_MESSAGE, { icon: '🔋', duration: 6000 })
      }
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    warnedRef.current = false
    requestWakeLock()

    // Always attempt a fresh request on becoming visible rather than
    // trusting our ref — the lock the browser silently released while the
    // tab was hidden is indistinguishable from a live one just by looking
    // at what we last stored.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [isActive, requestWakeLock])

  return requestWakeLock
}
