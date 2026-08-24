import Icon from './Icon'
import { useLanguage } from '../context/LanguageContext'

// Floating banner shown on the history/coach tabs whenever a workout is
// still active in the background — the workout tab's back button (see
// WorkoutTab.jsx) only ever switches tabs, it never ends the session, so
// without this the user would have no way back short of the bottom tab bar.
// Positioned just above BottomTabBar (fixed, bottom-0) rather than inside
// the scrolling content so it stays reachable regardless of scroll position.
export default function ResumeWorkoutBanner({ routineName, onResume }) {
  const { t } = useLanguage()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 px-4">
      <button
        type="button"
        onClick={onResume}
        className="animate-fade-slide-in pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-[rgb(var(--ctp-mauve))] px-4 py-3 text-[rgb(var(--ctp-base))] shadow-lg shadow-black/30 transition-all duration-150 ease-out active:scale-[0.98] active:opacity-90"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[rgb(var(--ctp-base))]" />
          <span className="min-w-0 text-right">
            <span className="block text-xs font-medium opacity-80">{t('resumeInProgress')}</span>
            <span className="block truncate text-sm font-bold">{routineName}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
          {t('resumeContinue')}
          <Icon name="chevron_left" className="text-[18px]" />
        </span>
      </button>
    </div>
  )
}
