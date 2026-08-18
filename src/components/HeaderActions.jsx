import Icon from './Icon'

// The settings-gear + dark/light toggle pair shown in every screen's header
// — was duplicated inline three times in the original monolith; now one
// component. `isOnline` shows a small warning badge before the two buttons
// when the device has no connection (see useNetworkStatus).
export default function HeaderActions({ isDark, onToggleDark, onOpenSettings, isOnline = true }) {
  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <Icon name="wifi_off" className="text-[16px]" />
          حالت آفلاین
        </span>
      )}
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="تنظیمات"
        title="تنظیمات"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-purple-600 dark:hover:bg-gray-800"
      >
        <Icon name="settings" className="text-[20px]" />
      </button>
      <button
        type="button"
        onClick={onToggleDark}
        className="rounded-full bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
      >
        {isDark ? 'حالت روشن' : 'حالت تاریک'}
      </button>
    </div>
  )
}
