import Icon from './Icon'
import SocialFooter from './SocialFooter'
import { REST_SOUND_OPTIONS } from '../utils/audio'

// Settings popup — centered modal with a dimmed, blurred backdrop. Houses
// the destructive "Clear All Data" action and sign-out, kept out of the
// main header so they can't be tapped by accident.
export default function SettingsModal({
  onClose,
  onClearData,
  onLogout,
  userEmail,
  restSound,
  onRestSoundChange,
}) {
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
          <h2 className="text-lg font-bold">تنظیمات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
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

        <div className="mb-5 flex flex-col gap-2">
          <label
            htmlFor="rest-sound"
            className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]"
          >
            صدای زنگ استراحت
          </label>
          <select
            id="rest-sound"
            value={restSound}
            onChange={(e) => onRestSoundChange(e.target.value)}
            className="rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
          >
            {REST_SOUND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onClearData}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[rgb(var(--ctp-red))] py-3.5 text-base font-bold text-[rgb(var(--ctp-red))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
          >
            <Icon name="delete_forever" className="text-[20px]" />
            پاک کردن تمام اطلاعات
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[rgb(var(--ctp-surface1))] py-3.5 text-base font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
          >
            <Icon name="logout" className="text-[20px]" />
            خروج
          </button>
        </div>

        <SocialFooter />
      </div>
    </div>
  )
}
