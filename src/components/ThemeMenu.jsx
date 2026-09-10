import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'
import ThemeSwitcher from './ThemeSwitcher'
import { useLanguage } from '../context/LanguageContext'

// Palette-icon button that opens a small popover with the ThemeSwitcher
// grid. Shared by the landing page, AuthScreen, and the main app header so
// the theme can be changed from anywhere without opening Settings.
//
// The popover hangs off the button's inline-end edge (`end-0`). On narrow
// phones the button is not at the screen edge (the login button sits after
// it), so the popover would spill past the viewport — `shift` measures that
// overflow after opening and nudges the panel back inside. It is applied via
// the `translate` property (not a margin, which is ignored on the anchored
// side of an absolute box, and not `transform`, which the pop-in animation
// owns).
const VIEWPORT_GUTTER_PX = 12

export default function ThemeMenu({ className = '' }) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const rootRef = useRef(null)
  const panelRef = useRef(null)

  useLayoutEffect(() => {
    if (!isOpen) return
    function clampToViewport() {
      const panel = panelRef.current
      const root = rootRef.current
      if (!panel || !root) return
      // Layout offsets rather than getBoundingClientRect(): the pop-in
      // animation scales the panel (and `translate` moves it), which would
      // skew a measured rect.
      const left = root.getBoundingClientRect().left + panel.offsetLeft
      const right = left + panel.offsetWidth
      const overflowRight = right - (window.innerWidth - VIEWPORT_GUTTER_PX)
      const overflowLeft = VIEWPORT_GUTTER_PX - left
      setShift(overflowRight > 0 ? -overflowRight : overflowLeft > 0 ? overflowLeft : 0)
    }
    clampToViewport()
    window.addEventListener('resize', clampToViewport)
    return () => window.removeEventListener('resize', clampToViewport)
  }, [isOpen])

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
          ref={panelRef}
          role="dialog"
          aria-label={t('settingsTheme')}
          style={{ translate: `${shift}px 0` }}
          className="animate-modal-pop absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-surface1/40 bg-surface0 p-3 text-text shadow-xl shadow-black/30"
        >
          <p className="mb-2 px-0.5 text-xs font-bold text-subtext0">{t('settingsTheme')}</p>
          <ThemeSwitcher />
        </div>
      )}
    </div>
  )
}
