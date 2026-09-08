import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, THEME_STORAGE_KEY, getTheme, isThemeId } from '../themes'

function loadStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(stored) ? stored : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

// `--color-base` is stored as a space-separated RGB triplet ("30 30 46") so
// Tailwind can apply alpha to it; <meta name="theme-color"> wants a real
// color, so convert the triplet to hex.
function tripletToHex(triplet) {
  const parts = triplet.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

// Owns the active theme: applies `data-theme` to <html> (which is what the
// CSS variable blocks in index.css key off), keeps Tailwind's `dark` class
// and the mobile status-bar color in sync, and persists the choice.
// Mounted once by ThemeProvider (context/ThemeContext.jsx); components read
// it through `useTheme()` so every switcher shares the same state.
export function useThemeManager() {
  const [theme, setThemeState] = useState(loadStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    // @tailwindcss/typography's `prose-invert` (AI coach markdown) keys off
    // the `dark` class — derived from the registry rather than toggled by hand.
    root.classList.toggle('dark', getTheme(theme).isDark)

    // Read the theme's base color back from CSS instead of duplicating a hex
    // table in JS: the attribute is set above, so computed styles already
    // reflect the new palette.
    const meta = document.getElementById('theme-color-meta')
    const hex = tripletToHex(getComputedStyle(root).getPropertyValue('--color-base'))
    if (meta && hex) meta.setAttribute('content', hex)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable (private mode, quota) — the theme still
      // applies for this tab session, it just won't be remembered.
    }
  }, [theme])

  // Follow theme changes made in another tab of the same origin.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === THEME_STORAGE_KEY && isThemeId(event.newValue)) {
        setThemeState(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = useCallback((id) => {
    if (isThemeId(id)) setThemeState(id)
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = THEMES.findIndex((entry) => entry.id === current)
      return THEMES[(index + 1) % THEMES.length].id
    })
  }, [])

  return { theme, themes: THEMES, setTheme, cycleTheme }
}
