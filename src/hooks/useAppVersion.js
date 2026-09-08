import { useCallback, useEffect, useRef, useState } from 'react'

// Latest release of the app, read from GitHub Releases and cached in
// localStorage so it survives being offline. Resolution:
//   1. the GitHub API, re-checked whenever the app comes to the foreground,
//      regains connectivity, or the periodic timer fires — but never more
//      often than MIN_CHECK_INTERVAL_MS;
//   2. the cached value, when offline, rate-limited (403), or the request
//      fails for any other reason;
//   3. the version inlined at build time (see vite.config.js) when nothing
//      has ever been cached — a first launch while offline.
// The value is also mirrored into the browser tab title.
//
// Rate limit: anonymous GitHub API calls are capped at 60/hour/IP, but a
// conditional request answered with 304 Not Modified is free. `cache:
// 'no-cache'` makes the browser revalidate its stored copy with the ETag on
// every check, so a check only "costs" a request when a new release actually
// exists. That is what lets the interval be minutes instead of an hour.
const STORAGE_KEY = 'gymbro_app_version'
const RELEASES_URL = 'https://api.github.com/repos/ImanMontajabi/Gymbro/releases/latest'
const MIN_CHECK_INTERVAL_MS = 5 * 60 * 1000
const PERIODIC_CHECK_MS = 15 * 60 * 1000

// "v1.2.0" / "V1.2.0" → "1.2.0"; the UI adds its own "v".
function normalizeTag(tag) {
  return String(tag ?? '')
    .trim()
    .replace(/^v/i, '')
}

function loadCachedVersion() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || typeof parsed.version !== 'string' || parsed.version === '') return null
    return { version: parsed.version, fetchedAt: Number(parsed.fetchedAt) || 0 }
  } catch {
    return null
  }
}

function saveCachedVersion(entry) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage unavailable — the value still lives in state for this tab
  }
}

export function useAppVersion() {
  const [cached, setCached] = useState(loadCachedVersion)
  const [fetchedThisSession, setFetchedThisSession] = useState(false)
  // Last check time lives in a ref (not only in the cache entry) so a check
  // that found nothing new still throttles the next one, even when
  // localStorage is unavailable.
  const lastCheckRef = useRef(0)
  const inFlightRef = useRef(null)

  const version = cached?.version ?? __GYMBRO_VERSION__
  const source = cached ? (fetchedThisSession ? 'github' : 'cache') : 'build'

  const check = useCallback(async ({ force = false } = {}) => {
    if (!navigator.onLine) return
    if (inFlightRef.current) return inFlightRef.current
    const lastCheck = Math.max(lastCheckRef.current, loadCachedVersion()?.fetchedAt ?? 0)
    if (!force && Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) return

    const controller = new AbortController()
    inFlightRef.current = (async () => {
      try {
        const res = await fetch(RELEASES_URL, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-cache',
          signal: controller.signal,
        })
        // 403 = rate limited, 404 = no release published yet: keep whatever
        // we already have rather than showing nothing.
        if (!res.ok) return
        const data = await res.json()
        const next = normalizeTag(data?.tag_name)
        if (!next) return
        const entry = { version: next, fetchedAt: Date.now() }
        lastCheckRef.current = entry.fetchedAt
        saveCachedVersion(entry)
        setCached(entry)
        setFetchedThisSession(true)
      } catch {
        // offline mid-request, DNS failure, or aborted on unmount — keep cache
      } finally {
        inFlightRef.current = null
      }
    })()
    inFlightRef.current.abort = () => controller.abort()
    return inFlightRef.current
  }, [])

  useEffect(() => {
    check()

    // Every way an installed PWA can wake up without re-mounting App:
    // tab/app brought back to the foreground, window focused, restored from
    // the back-forward cache, or connectivity returning.
    function handleVisibility() {
      if (document.visibilityState === 'visible') check()
    }
    const wake = () => check()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', wake)
    window.addEventListener('pageshow', wake)
    window.addEventListener('online', wake)
    // Long-lived foreground sessions (a laptop tab left open) get a timer.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') check()
    }, PERIODIC_CHECK_MS)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', wake)
      window.removeEventListener('pageshow', wake)
      window.removeEventListener('online', wake)
      clearInterval(timer)
      inFlightRef.current?.abort?.()
    }
  }, [check])

  useEffect(() => {
    document.title = `Gymbro - v${version}`
  }, [version])

  return { version, source, refresh: () => check({ force: true }) }
}
