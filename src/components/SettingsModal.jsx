import Icon from './Icon'
import { REST_SOUND_OPTIONS } from '../utils/audio'

// Settings popup — centered modal with a dimmed backdrop. Houses the
// destructive "Clear All Data" action and sign-out, kept out of the main
// header so they can't be tapped by accident.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">تنظیمات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {userEmail && (
          <p
            dir="ltr"
            className="mb-4 truncate text-right text-sm text-gray-500 dark:text-gray-400"
          >
            {userEmail}
          </p>
        )}

        <div className="mb-5 flex flex-col gap-2">
          <label
            htmlFor="rest-sound"
            className="text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            صدای زنگ استراحت
          </label>
          <select
            id="rest-sound"
            value={restSound}
            onChange={(e) => onRestSoundChange(e.target.value)}
            className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500 py-3.5 text-base font-bold text-red-500 transition active:scale-95 dark:border-red-500/70 dark:text-red-400"
          >
            <Icon name="delete_forever" className="text-[20px]" />
            پاک کردن تمام اطلاعات
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-600 transition active:scale-95 dark:border-gray-700 dark:text-gray-300"
          >
            <Icon name="logout" className="text-[20px]" />
            خروج
          </button>
        </div>
      </div>
    </div>
  )
}
