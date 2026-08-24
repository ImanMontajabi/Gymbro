import { createContext, useContext, useEffect, useState } from 'react'
import { LANGUAGES, LANGUAGE_DIR, translate } from '../i18n/translations'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'gymbro_language'

function loadStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.includes(stored) ? stored : 'fa'
  } catch {
    return 'fa'
  }
}

// Global language: sets `lang`/`dir` on <html> (mirrors ThemeContext's
// `data-ctp-theme` pattern) so the browser's own text direction, form
// controls, and native date/number formatting all follow the active
// language, not just the strings this app renders itself. `t(key)` is the
// only thing components need — it always resolves against the current
// language.
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(loadStoredLanguage)

  useEffect(() => {
    document.documentElement.setAttribute('lang', language)
    document.documentElement.setAttribute('dir', LANGUAGE_DIR[language])
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // localStorage unavailable (private mode, quota) — language still
      // works for this tab session, it just won't be remembered.
    }
  }, [language])

  function cycleLanguage() {
    const index = LANGUAGES.indexOf(language)
    setLanguage(LANGUAGES[(index + 1) % LANGUAGES.length])
  }

  function t(key) {
    return translate(key, language)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, cycleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
