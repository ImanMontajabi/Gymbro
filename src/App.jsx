import { lazy, Suspense, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useMutationQueue } from './hooks/useMutationQueue'
import { useRestTimer } from './hooks/useRestTimer'
import { useRestSound } from './hooks/useRestSound'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useProgressChart } from './hooks/useProgressChart'
import { useAiCoach } from './hooks/useAiCoach'
import AuthScreen from './components/AuthScreen'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import WorkoutTab from './components/WorkoutTab'
import HistoryTab from './components/HistoryTab'

// react-markdown drags in a sizable markdown/remark toolchain — only worth
// paying for once the user actually opens the coach tab, so it's split into
// its own chunk instead of bloating the initial PWA payload.
const AiCoachTab = lazy(() => import('./components/AiCoachTab'))

// Colors are CSS-variable references, not literals — the browser resolves
// them against whichever --ctp-* values are active at paint time, so toasts
// follow the current Catppuccin flavor without this object needing to be
// theme-aware itself.
const toastOptions = {
  duration: 3000,
  style: {
    background: 'rgb(var(--ctp-surface0))',
    color: 'rgb(var(--ctp-text))',
    fontFamily: 'Vazirmatn, sans-serif',
    direction: 'rtl',
    borderRadius: '0.75rem',
    padding: '10px 16px',
    fontSize: '0.95rem',
  },
  success: {
    iconTheme: { primary: 'rgb(var(--ctp-mauve))', secondary: 'rgb(var(--ctp-surface0))' },
  },
  error: {
    iconTheme: { primary: 'rgb(var(--ctp-red))', secondary: 'rgb(var(--ctp-surface0))' },
  },
}

// App shell: owns which tab is active, the single shared <audio> element
// used for the rest-timer alarm (and its iOS unlock tap), and the toast
// host. Everything else — data fetching, CRUD, timers, screens — is
// composed from hooks/components and handed down as props.
function App() {
  const { authSession, user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('workout') // 'workout' | 'history' | 'coach'
  // Marketing landing page shown before AuthScreen on first visit. Reset to
  // true on logout so a signed-out user lands back on it rather than going
  // straight to the login form.
  const [showLandingPage, setShowLandingPage] = useState(true)

  function handleLogout() {
    logout()
    setShowLandingPage(true)
  }

  const isOnline = useNetworkStatus()
  const { writeMutation } = useMutationQueue()

  const audioRef = useRef(null)
  const timer = useRestTimer(audioRef)
  const { restSound, setRestSound } = useRestSound(audioRef)
  const workout = useWorkoutData({
    user,
    audioRef,
    timer,
    writeMutation,
  })
  const progressChart = useProgressChart(workout.history)
  const aiCoach = useAiCoach()

  const toaster = (
    <Toaster
      position="top-center"
      containerStyle={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      toastOptions={toastOptions}
    />
  )

  // --- Auth gate --------------------------------------------------------------

  if (authSession === undefined)
    return (
      <>
        {toaster}
        <LoadingScreen />
      </>
    )
  if (!user)
    return (
      <>
        {toaster}
        <div key={showLandingPage ? 'landing' : 'auth'} className="animate-fade-in">
          {showLandingPage ? (
            <LandingPage onEnterApp={() => setShowLandingPage(false)} />
          ) : (
            <AuthScreen onBack={() => setShowLandingPage(true)} />
          )}
        </div>
      </>
    )
  if (workout.dataLoading)
    return (
      <>
        {toaster}
        <LoadingScreen />
      </>
    )

  // --- Authenticated app --------------------------------------------------

  return (
    <>
      {toaster}
      <audio ref={audioRef} src={`/sounds/${restSound}`} preload="auto" />
      {activeTab === 'history' ? (
        <HistoryTab
          history={workout.history}
          progressChart={progressChart}
          user={user}
          onLogout={handleLogout}
          isOnline={isOnline}
          restSound={restSound}
          onRestSoundChange={setRestSound}
          onClearData={workout.handleClearAllData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : activeTab === 'coach' ? (
        <Suspense fallback={<LoadingScreen />}>
          <AiCoachTab
            aiCoach={aiCoach}
            routines={workout.routines}
            history={workout.history}
            user={user}
            onLogout={handleLogout}
            isOnline={isOnline}
            restSound={restSound}
            onRestSoundChange={setRestSound}
            onClearData={workout.handleClearAllData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Suspense>
      ) : (
        <WorkoutTab
          workout={workout}
          timer={timer}
          user={user}
          onLogout={handleLogout}
          isOnline={isOnline}
          restSound={restSound}
          onRestSoundChange={setRestSound}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </>
  )
}

export default App
