import { useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useDarkMode } from './hooks/useDarkMode'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useMutationQueue } from './hooks/useMutationQueue'
import { useRestTimer } from './hooks/useRestTimer'
import { useRestSound } from './hooks/useRestSound'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useProgressChart } from './hooks/useProgressChart'
import AuthScreen from './components/AuthScreen'
import LoadingScreen from './components/LoadingScreen'
import WorkoutTab from './components/WorkoutTab'
import HistoryTab from './components/HistoryTab'

const toastOptions = {
  duration: 3000,
  style: {
    background: '#1f2937',
    color: '#f3f4f6',
    fontFamily: 'Vazirmatn, sans-serif',
    direction: 'rtl',
    borderRadius: '0.75rem',
    padding: '10px 16px',
    fontSize: '0.95rem',
  },
  success: { iconTheme: { primary: '#a855f7', secondary: '#1f2937' } },
  error: { iconTheme: { primary: '#ef4444', secondary: '#1f2937' } },
}

// App shell: owns which tab is active, the single shared <audio> element
// used for the rest-timer alarm (and its iOS unlock tap), and the toast
// host. Everything else — data fetching, CRUD, timers, screens — is
// composed from hooks/components and handed down as props.
function App() {
  const { authSession, user, logout } = useAuth()
  const [isDark, setIsDark] = useDarkMode()
  const [activeTab, setActiveTab] = useState('workout') // 'workout' | 'history'

  const isOnline = useNetworkStatus()
  const { writeMutation } = useMutationQueue()

  const audioRef = useRef(null)
  const timer = useRestTimer(audioRef)
  const { restSound, setRestSound } = useRestSound(audioRef)
  const workout = useWorkoutData({
    user,
    audioRef,
    timer,
    onDataCleared: () => setIsDark(true),
    writeMutation,
  })
  const progressChart = useProgressChart(workout.history)

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
        <AuthScreen />
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

  const toggleDark = () => setIsDark((d) => !d)

  return (
    <>
      {toaster}
      <audio ref={audioRef} src={`/sounds/${restSound}`} preload="auto" />
      {activeTab === 'history' ? (
        <HistoryTab
          history={workout.history}
          progressChart={progressChart}
          user={user}
          onLogout={logout}
          isDark={isDark}
          onToggleDark={toggleDark}
          isOnline={isOnline}
          restSound={restSound}
          onRestSoundChange={setRestSound}
          onClearData={workout.handleClearAllData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <WorkoutTab
          workout={workout}
          timer={timer}
          user={user}
          onLogout={logout}
          isDark={isDark}
          onToggleDark={toggleDark}
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
