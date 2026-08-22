import { lazy, Suspense, useState } from 'react'
import HeaderActions from './HeaderActions'
import SettingsModal from './SettingsModal'
import BottomTabBar from './BottomTabBar'
import { formatSessionDate } from '../utils/history'

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
  restSound,
  onRestSoundChange,
  onClearData,
  activeTab,
  onTabChange,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { exerciseNames, selectedExercise, setSelectedExercise, chartData } = progressChart

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
      restSound={restSound}
      onRestSoundChange={onRestSoundChange}
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
