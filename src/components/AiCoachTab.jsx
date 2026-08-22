import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Icon from './Icon'
import HeaderActions from './HeaderActions'
import SettingsModal from './SettingsModal'
import BottomTabBar from './BottomTabBar'

// Tab 3: on-demand AI performance analysis. `aiCoach` is the object
// returned by useAiCoach() in App.jsx; `routines`/`history` are handed
// straight to it when the user asks for a report, so the aggregation
// (generateWorkoutReport) always runs on the latest data.
export default function AiCoachTab({
  aiCoach,
  routines,
  history,
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
  const { analysis, isLoading, requestAnalysis } = aiCoach

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
          <h1 className="text-2xl font-bold">مربی من</h1>
          <HeaderActions onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />
        </header>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => requestAnalysis(routines, history)}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--ctp-mauve))] py-4 text-lg font-bold text-[rgb(var(--ctp-base))] shadow-md shadow-black/20 transition-all duration-150 ease-out active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:bg-[rgb(var(--ctp-surface1))] disabled:text-[rgb(var(--ctp-subtext0))] disabled:shadow-none"
          >
            {isLoading && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--ctp-base))]/70 border-t-transparent" />
            )}
            <Icon name="auto_awesome" className="text-[20px]" />
            {isLoading ? 'در حال تحلیل...' : 'دریافت تحلیل عملکرد'}
          </button>

          {isLoading && (
            <div className="animate-fade-slide-in flex flex-col gap-2 rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10">
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-[rgb(var(--ctp-surface1))]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[rgb(var(--ctp-surface1))]" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-[rgb(var(--ctp-surface1))]" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-[rgb(var(--ctp-surface1))]" />
            </div>
          )}

          {!isLoading && analysis && (
            <div className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-mauve)/0.3)] bg-[rgb(var(--ctp-mauve)/0.08)] p-4 shadow-md shadow-black/10">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[rgb(var(--ctp-mauve))]">
                <Icon name="auto_awesome" className="text-[18px]" />
                تحلیل مربی هوشمند
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-[rgb(var(--ctp-text))]">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}

          {!isLoading && !analysis && (
            <p className="rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 text-center text-sm text-[rgb(var(--ctp-subtext0))] shadow-md shadow-black/10">
              برای دریافت تحلیل عملکرد و پیشنهادهای شخصی‌سازی‌شده، دکمه بالا را بزنید
            </p>
          )}
        </div>
      </div>
      <BottomTabBar activeTab={activeTab} onChange={onTabChange} />
    </div>
  )
}
