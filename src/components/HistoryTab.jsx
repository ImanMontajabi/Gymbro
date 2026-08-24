import { lazy, Suspense, useState } from 'react'
import toast from 'react-hot-toast'
import RMDPModule from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'
import HeaderActions from './HeaderActions'
import SettingsModal from './SettingsModal'
import BottomTabBar from './BottomTabBar'
import Icon from './Icon'
import { formatSessionDate, formatSessionForAI, filterSessionsByDateRange } from '../utils/history'

// A plain `import DatePicker from 'react-multi-date-picker'` resolves to
// the package's CJS module namespace object, not the component itself —
// under Vite's dev-mode CJS-to-ESM interop for this package, the real
// forwardRef component lives one level deeper, at `.default`. Confirmed
// against both `npm run dev` and `npm run build`, so unwrap it explicitly
// rather than relying on the default-import binding directly.
const DatePicker = RMDPModule.default

// Matches the app's other text inputs (see the rest-sound <select> in
// SettingsModal.jsx) — `inputClass` fully replaces the picker's own default
// input className, so this is the only styling that input gets.
const DATE_INPUT_CLASS =
  'w-full rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-3 py-2.5 text-sm text-[rgb(var(--ctp-text))] focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]'

// recharts is large and only needed once this tab is opened, so it's split
// into its own chunk instead of bloating the initial PWA payload.
const ProgressChart = lazy(() => import('./ProgressChart'))

// Tab 2: the progress chart + list of completed workouts. `progressChart` is
// the object returned by useProgressChart() in App.jsx.
export default function HistoryTab({
  history,
  progressChart,
  user,
  onLogout,
  isOnline,
  onClearData,
  activeTab,
  onTabChange,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Holds react-multi-date-picker DateObjects (Persian calendar) — converted
  // to Gregorian 'YYYY-MM-DD' strings only at export time, since that's the
  // format Supabase/filterSessionsByDateRange/formatSessionForAI expect.
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const { exerciseNames, selectedExercise, setSelectedExercise, chartData } = progressChart

  async function handleExportRange() {
    const start = startDate?.toDate().toISOString().slice(0, 10) ?? ''
    const end = endDate?.toDate().toISOString().slice(0, 10) ?? ''

    if (!start || !end) {
      toast.error('لطفاً بازه تاریخ را انتخاب کنید')
      return
    }

    const sessions = filterSessionsByDateRange(history, start, end)
    if (sessions.length === 0) {
      toast('تمرینی در این بازه تاریخی یافت نشد', { icon: '⚠️' })
      return
    }

    const report = sessions.map(formatSessionForAI).join('\n\n')
    try {
      await navigator.clipboard.writeText(report)
      toast.success(`گزارش ${sessions.length} تمرین کپی شد`)
    } catch {
      toast.error('کپی کردن ناموفق بود')
    }
  }

  const settingsModal = isSettingsOpen && (
    <SettingsModal
      onClose={() => setIsSettingsOpen(false)}
      onClearData={() => {
        onClearData()
        setIsSettingsOpen(false)
      }}
      onLogout={() => {
        setIsSettingsOpen(false)
        onLogout()
      }}
      userEmail={user?.email}
    />
  )

  return (
    <div className="min-h-screen bg-[rgb(var(--ctp-base))] text-[rgb(var(--ctp-text))]">
      {settingsModal}
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">تاریخچه و پیشرفت</h1>
          <HeaderActions onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />
        </header>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10">
            <h2 className="mb-3 text-lg font-bold">گزارش‌گیری</h2>
            <div className="flex items-center gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-[rgb(var(--ctp-subtext0))]">
                  از تاریخ
                </span>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass={DATE_INPUT_CLASS}
                  containerClassName="ctp-datepicker w-full"
                  className="ctp-datepicker"
                  placeholder="انتخاب تاریخ"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-[rgb(var(--ctp-subtext0))]">
                  تا تاریخ
                </span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-left"
                  inputClass={DATE_INPUT_CLASS}
                  containerClassName="ctp-datepicker w-full"
                  className="ctp-datepicker"
                  placeholder="انتخاب تاریخ"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleExportRange}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--ctp-mauve))] py-3 text-sm font-bold text-[rgb(var(--ctp-base))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
            >
              <Icon name="content_copy" className="text-[18px]" />
              کپی گزارش برای AI
            </button>
          </section>

          <Suspense
            fallback={
              <div className="h-[19.5rem] animate-pulse rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] shadow-md shadow-black/10" />
            }
          >
            <ProgressChart
              exerciseNames={exerciseNames}
              selectedExercise={selectedExercise}
              onSelectExercise={setSelectedExercise}
              chartData={chartData}
            />
          </Suspense>

          <section>
            <h2 className="mb-3 text-lg font-bold">تمرین‌های گذشته</h2>
            {history.length === 0 ? (
              <p className="rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 text-center text-sm text-[rgb(var(--ctp-subtext0))] shadow-md shadow-black/10">
                هنوز تمرینی به پایان نرسانده‌اید
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((session) => {
                  const totalSets = session.exercises.reduce(
                    (sum, ex) => sum + ex.sets.length,
                    0
                  )
                  return (
                    <li
                      key={session.id}
                      className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-base font-bold">{session.routineName}</h3>
                        <span className="shrink-0 text-xs text-[rgb(var(--ctp-subtext0))]">
                          {formatSessionDate(session.date)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[rgb(var(--ctp-subtext0))]">
                        {session.exercises.length} حرکت · {totalSets} ست
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
      <BottomTabBar activeTab={activeTab} onChange={onTabChange} />
    </div>
  )
}
