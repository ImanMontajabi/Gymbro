import { createContext, useContext, useEffect, useState } from 'react'

export const CTP_THEMES = ['latte', 'frappe', 'macchiato', 'mocha']

// Base hex per flavor — kept separate from the RGB-triplet CSS variables in
// index.css because the <meta name="theme-color"> tag needs a real color
// value, not something a CSS var can resolve for us.
const CTP_BASE_HEX = {
  latte: '#eff1f5',
  frappe: '#303446',
  macchiato: '#24273a',
  mocha: '#1e1e2e',
}

const ThemeContext = createContext(null)

// Global Catppuccin theme: sets `data-ctp-theme` on <html> so the --ctp-*
// variables in index.css cascade to the whole document (landing page, auth
// screen, and the main app alike), and keeps the mobile status-bar color
// (<meta name="theme-color">) in sync so it never shows as a mismatched
// black/white bar against the themed page.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('mocha')

  useEffect(() => {
    document.documentElement.setAttribute('data-ctp-theme', theme)
    const meta = document.getElementById('theme-color-meta')
    if (meta) meta.setAttribute('content', CTP_BASE_HEX[theme])
  }, [theme])

  function shuffleTheme() {
    const options = CTP_THEMES.filter((t) => t !== theme)
    setTheme(options[Math.floor(Math.random() * options.length)])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, shuffleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
