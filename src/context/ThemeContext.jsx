import { createContext, useContext } from 'react'
import { useThemeManager } from '../hooks/useTheme'

const ThemeContext = createContext(null)

// Global theme: the actual work (data-theme attribute, `dark` class, status
// bar color, localStorage) happens in hooks/useTheme.js; this provider just
// mounts it once so every ThemeMenu / ThemeSwitcher shares the same state.
export function ThemeProvider({ children }) {
  const value = useThemeManager()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
