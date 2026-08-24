import { useLanguage } from '../context/LanguageContext'
import { LANGUAGE_LABEL } from '../i18n/translations'

// Cycles fa → en → ar → fa on tap, same interaction pattern as ThemeToggle's
// palette shuffle. Shows the *current* language's own short code in its own
// script (not the language it would switch to), so the label itself always
// reads correctly regardless of which language is active.
export default function LanguageToggle({ className = '' }) {
  const { language, cycleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={cycleLanguage}
      aria-label="تغییر زبان / Change language / تغيير اللغة"
      className={`flex h-9 min-w-9 items-center justify-center rounded-full border border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-surface0)/0.5)] px-2 text-xs font-bold text-[rgb(var(--ctp-mauve))] transition-all duration-150 ease-out active:scale-90 active:opacity-70 ${className}`}
    >
      {LANGUAGE_LABEL[language]}
    </button>
  )
}
