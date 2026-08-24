import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useMutationQueue } from './hooks/useMutationQueue'
import { useRestTimer } from './hooks/useRestTimer'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useProgressChart } from './hooks/useProgressChart'
import { useAiCoach } from './hooks/useAiCoach'
import { useWakeLock } from './hooks/useWakeLock'
import AuthScreen from './components/AuthScreen'
import LandingPage from './components/LandingPage'
import LoadingScreen from './components/LoadingScreen'
import WorkoutTab from './components/WorkoutTab'
import ResumeWorkoutBanner from './components/ResumeWorkoutBanner'

// react-markdown (AiCoachTab) and react-multi-date-picker (HistoryTab) are
// both sizable and only needed once the user opens that specific tab, so
// they're split into their own chunks instead of bloating the initial PWA
// payload.
const AiCoachTab = lazy(() => import('./components/AiCoachTab'))
const HistoryTab = lazy(() => import('./components/HistoryTab'))

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

// The authenticated tabbed app (/dashboard). Split into its own component
// (rather than inlined in App) because it needs useNavigate for the
// post-logout redirect, and that hook only works on a descendant of
// <BrowserRouter> — App itself is the one that renders the router, so it
// can't call the hook directly.
function Dashboard({ user, logout, workout, timer, isOnline, aiCoach }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('workout') // 'workout' | 'history' | 'coach'
  const progressChart = useProgressChart(workout.history)

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (workout.dataLoading) return <LoadingScreen />

  return (
    <>
      {activeTab === 'history' ? (
        <Suspense fallback={<LoadingScreen />}>
          <HistoryTab
            history={workout.history}
            progressChart={progressChart}
            user={user}
            onLogout={handleLogout}
            isOnline={isOnline}
            onClearData={workout.handleClearAllData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Suspense>
      ) : activeTab === 'coach' ? (
        <Suspense fallback={<LoadingScreen />}>
          <AiCoachTab
            aiCoach={aiCoach}
            routines={workout.routines}
            history={workout.history}
            user={user}
            onLogout={handleLogout}
            isOnline={isOnline}
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
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
      {activeTab !== 'workout' && workout.activeSession && (
        <ResumeWorkoutBanner
          routineName={workout.activeSession.routineName}
          onResume={() => setActiveTab('workout')}
        />
      )}
    </>
  )
}

// App shell: owns the toast host and top-level routing. Everything else —
// data fetching, CRUD, timers, screens — is composed from hooks/components
// and handed down as props.
function App() {
  const { authSession, user, logout } = useAuth()

  const isOnline = useNetworkStatus()
  const { writeMutation } = useMutationQueue()

  const timer = useRestTimer()
  const workout = useWorkoutData({
    user,
    timer,
    writeMutation,
  })
  const aiCoach = useAiCoach()

  // Keyed on activeSession rather than the workout tab being open — the
  // screen should stay awake for the whole workout, including while the
  // user is briefly checking history or the coach mid-session.
  useWakeLock(!!workout.activeSession)

  const toaster = (
    <Toaster
      position="top-center"
      containerStyle={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      toastOptions={toastOptions}
    />
  )

  // authSession is undefined only while the initial Supabase session check
  // is in flight — nothing about routing can be decided yet.
  if (authSession === undefined)
    return (
      <>
        {toaster}
        <LoadingScreen />
      </>
    )

  return (
    <BrowserRouter>
      {toaster}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthScreen />} />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard
                user={user}
                logout={logout}
                workout={workout}
                timer={timer}
                isOnline={isOnline}
                aiCoach={aiCoach}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
