import Icon from './Icon'
import ThemeToggle from './ThemeToggle'
import { useLanguage } from '../context/LanguageContext'

// The theme toggle + settings-gear pair shown in every screen's header —
// was duplicated inline three times in the original monolith; now one
// component. `isOnline` shows a small warning badge before the buttons when
// the device has no connection (see useNetworkStatus). Light/dark used to be
// a separate manual toggle here; Catppuccin flavors now cover that (Latte is
// the light flavor), so ThemeToggle is the only theme control left.
export default function HeaderActions({ onOpenSettings, isOnline = true }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[rgb(var(--ctp-yellow)/0.15)] px-3 py-2 text-xs font-bold text-[rgb(var(--ctp-yellow))]">
          <Icon name="wifi_off" className="text-[16px]" />
          {t('headerOffline')}
        </span>
      )}
      <ThemeToggle />
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('headerSettings')}
        title={t('headerSettings')}
        className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
      >
        <Icon name="settings" className="text-[20px]" />
      </button>
    </div>
  )
}
