import { useEffect, useState } from 'react'

// Latest release of the app, read from GitHub Releases and cached in
// localStorage so it survives being offline. Resolution:
//   1. the GitHub API, at most once per REFRESH_INTERVAL_MS (the anonymous
//      limit is 60 requests/hour per IP, and a PWA boots often);
//   2. the cached value, when offline, rate-limited (403), or the request
//      fails for any other reason;
//   3. the version inlined at build time (see vite.config.js) when nothing
//      has ever been cached — a first launch while offline.
// The value is also mirrored into the browser tab title.
const STORAGE_KEY = 'gymbro_app_version'
const RELEASES_URL = 'https://api.github.com/repos/ImanMontajabi/Gymbro/releases/latest'
const REFRESH_INTERVAL_MS = 60 * 60 * 1000

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

  const version = cached?.version ?? __GYMBRO_VERSION__
  const source = cached ? (fetchedThisSession ? 'github' : 'cache') : 'build'

  useEffect(() => {
    const controller = new AbortController()

    async function refresh() {
      if (!navigator.onLine) return
      const current = loadCachedVersion()
      if (current && Date.now() - current.fetchedAt < REFRESH_INTERVAL_MS) return
      try {
        const res = await fetch(RELEASES_URL, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
        })
        // 403 = rate limited, 404 = no release published yet: keep whatever
        // we already have rather than showing nothing.
        if (!res.ok) return
        const data = await res.json()
        const next = normalizeTag(data?.tag_name)
        if (!next) return
        const entry = { version: next, fetchedAt: Date.now() }
        saveCachedVersion(entry)
        setCached(entry)
        setFetchedThisSession(true)
      } catch {
        // offline mid-request, DNS failure, or aborted on unmount — keep cache
      }
    }

    refresh()
    window.addEventListener('online', refresh)
    return () => {
      controller.abort()
      window.removeEventListener('online', refresh)
    }
  }, [])

  useEffect(() => {
    document.title = `Gymbro - v${version}`
  }, [version])

  return { version, source }
}
