import { useTheme } from '../context/ThemeContext'
import Icon from './Icon'

// Palette-icon button that randomly switches between the 4 Catppuccin
// flavors (Latte, Frappé, Macchiato, Mocha). Shared by the landing page,
// AuthScreen, and the main app header so the theme is switchable from
// anywhere.
export default function ThemeToggle({ className = '' }) {
  const { shuffleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={shuffleTheme}
      aria-label="تغییر تم"
      className={`flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-surface0)/0.5)] transition-all duration-150 ease-out active:scale-90 active:opacity-70 ${className}`}
    >
      <Icon name="palette" className="text-[18px] text-[rgb(var(--ctp-mauve))]" />
    </button>
  )
}
