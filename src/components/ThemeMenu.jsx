import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import ThemeSwitcher from './ThemeSwitcher'
import { useLanguage } from '../context/LanguageContext'

// Palette-icon button that opens a small popover with the ThemeSwitcher
// grid. Shared by the landing page, AuthScreen, and the main app header so
// the theme can be changed from anywhere without opening Settings.
//
// The popover hangs off the button's inline-end edge (`end-0`), so the
// button must sit at the inline-end side of its header in every language —
// which is where all three call sites place it.
export default function ThemeMenu({ className = '' }) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t('themeChange')}
        title={t('themeChange')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-surface0 transition-all duration-150 ease-out active:scale-90 active:opacity-70 ${
          isOpen ? 'bg-surface1/60' : 'bg-surface0/50'
        }`}
      >
        <Icon name="palette" className="text-[18px] text-primary" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={t('settingsTheme')}
          className="animate-modal-pop absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-surface1/40 bg-surface0 p-3 text-text shadow-xl shadow-black/30"
        >
          <p className="mb-2 px-0.5 text-xs font-bold text-subtext0">{t('settingsTheme')}</p>
          <ThemeSwitcher />
        </div>
      )}
    </div>
  )
}
