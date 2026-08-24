import Icon from './Icon'
import SocialFooter from './SocialFooter'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from '../context/LanguageContext'

// Settings popup — centered modal with a dimmed, blurred backdrop. Houses
// the language switch, the destructive "Clear All Data" action, and
// sign-out, kept out of the main header so they can't be tapped by accident.
export default function SettingsModal({ onClose, onClearData, onLogout, userEmail }) {
  const { t } = useLanguage()
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop w-full max-w-sm rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-5 text-[rgb(var(--ctp-text))] shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('settingsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] active:scale-90 active:opacity-70"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {userEmail && (
          <p dir="ltr" className="mb-4 truncate text-right text-sm text-[rgb(var(--ctp-subtext0))]">
            {userEmail}
          </p>
        )}

        <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-3">
          <span className="text-sm font-bold text-[rgb(var(--ctp-text))]">
            {t('settingsLanguage')}
          </span>
          <LanguageToggle />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onClearData}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[rgb(var(--ctp-red))] py-3.5 text-base font-bold text-[rgb(var(--ctp-red))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
          >
            <Icon name="delete_forever" className="text-[20px]" />
            {t('settingsClearData')}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[rgb(var(--ctp-surface1))] py-3.5 text-base font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
          >
            <Icon name="logout" className="text-[20px]" />
            {t('settingsLogout')}
          </button>
        </div>

        <SocialFooter />
      </div>
    </div>
  )
}
