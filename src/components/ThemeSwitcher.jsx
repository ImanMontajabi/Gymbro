import Icon from './Icon'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

// Grid of square theme cards, numbered 1..n. Each card carries
// `data-theme={id}` itself, so the CSS variable block for that theme applies
// to the card's subtree — the card's background, border and number are
// painted in that theme's own colors straight from index.css, while the rest
// of the page keeps the active theme. Shared by SettingsModal (inline) and
// ThemeMenu (popover).
export default function ThemeSwitcher({ className = '' }) {
  const { theme, themes, setTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <div
      role="radiogroup"
      aria-label={t('settingsTheme')}
      className={`grid grid-cols-3 gap-2 ${className}`}
    >
      {themes.map((entry, index) => {
        const isActive = entry.id === theme
        return (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={entry.name}
            title={entry.name}
            data-theme={entry.id}
            onClick={() => setTheme(entry.id)}
            className={`relative flex aspect-square items-center justify-center rounded-xl border bg-base transition-all duration-150 ease-out active:scale-95 ${
              isActive
                ? 'border-primary ring-2 ring-primary/40'
                : 'border-surface1/60 hover:border-subtext0/50'
            }`}
          >
            {/* The number is the only flow child, so flex centering puts it
                dead center; the check mark is absolutely positioned in the
                corner so it never nudges the number off-center. */}
            <span dir="ltr" className="text-xl font-bold leading-none tabular-nums text-primary">
              {index + 1}
            </span>
            {isActive && (
              <Icon
                name="check_circle"
                className="absolute end-1 top-1 text-[14px] leading-none text-primary"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
