import { useEffect, useMemo, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from './supabase'
import { findPreviousExercise, formatSessionDate } from './utils/history'
import {
  REST_SOUND_OPTIONS,
  loadRestSoundPreference,
  saveRestSoundPreference,
} from './utils/audio'
import { sanitizeNumericInput } from './utils/numbers'

const EMPTY_DRAFT = { weight: '', reps: '', note: '' }

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Maps a `routines` row (with its nested `exercises` rows, snake_case
// columns) to the shape the rest of the app works with.
function mapRoutineRow(row) {
  return {
    id: row.id,
    name: row.name,
    exercises: (row.exercises ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((ex) => ({ id: ex.id, name: ex.name, restTime: ex.rest_time })),
  }
}

// Maps a `sessions` row to the shape used for both activeSession and
// history entries — `exercises` is already stored as JSONB in this shape.
function mapSessionRow(row) {
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    date: row.date,
    exercises: row.exercises ?? [],
  }
}

// Google Material Symbols (Outlined). `name` is any valid symbol name, e.g.
// "edit", "delete", "close", "add", "check".
function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined select-none leading-none ${className}`}>
      {name}
    </span>
  )
}

// Shared inline "text input + confirm + cancel" row, used for renaming a
// routine/exercise and for the two "add new" forms.
function NameEditRow({ initialValue, placeholder, onSave, onCancel, isSaving = false }) {
  const [draft, setDraft] = useState(initialValue)

  function save() {
    const trimmed = draft.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder={placeholder}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
        className="min-w-0 flex-1 rounded-lg border border-purple-400 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        aria-label="ذخیره"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-green-600 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:text-green-400 dark:hover:bg-gray-800"
      >
        {isSaving ? (
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent dark:border-green-400" />
        ) : (
          <Icon name="check" className="text-[20px]" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        aria-label="لغو"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-60 dark:hover:bg-gray-800"
      >
        <Icon name="close" className="text-[20px]" />
      </button>
    </div>
  )
}

// Add/rename form for an exercise: name + rest time (seconds). Used both for
// "افزودن حرکت" and for the edit action on an existing exercise card.
function ExerciseEditRow({ initialName, initialRestTime, onSave, onCancel }) {
  const [name, setName] = useState(initialName)
  const [restTime, setRestTime] = useState(initialRestTime > 0 ? String(initialRestTime) : '')

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSave({ name: trimmedName, restTime: Number(restTime) > 0 ? Number(restTime) : 0 })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        value={name}
        placeholder="نام حرکت"
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-purple-400 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          زمان استراحت (ثانیه)
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="۹۰"
          value={restTime}
          onChange={(e) => setRestTime(sanitizeNumericInput(e.target.value))}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-bold text-white"
        >
          ذخیره
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300"
        >
          لغو
        </button>
      </div>
    </div>
  )
}

// Settings popup — centered modal with a dimmed backdrop. Houses the
// destructive "Clear All Data" action and sign-out, kept out of the main
// header so they can't be tapped by accident.
function SettingsModal({
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

// Email/password sign-in + sign-up screen, shown whenever there's no
// authenticated Supabase session.
function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const { error: authError } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }
    if (mode === 'signup') {
      setNotice('ثبت‌نام انجام شد. ایمیل خود را برای تایید حساب بررسی کنید.')
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
    setNotice('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
        <h1 className="mb-1 text-center text-2xl font-bold">جیم برو</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'login' ? 'وارد حساب کاربری خود شوید' : 'ایجاد حساب کاربری جدید'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-purple-600 py-4 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        <button
          type="button"
          onClick={toggleMode}
          className="mt-4 w-full text-center text-sm font-medium text-purple-600 dark:text-purple-400"
        >
          {mode === 'login' ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید'}
        </button>
      </div>
    </div>
  )
}

// Skeleton loader shown while checking the auth session and while the
// initial Supabase fetch (routines/history/active session) is in flight —
// avoids a blank flash on a cloud-backed app that always has some latency.
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}

function App() {
  const [authSession, setAuthSession] = useState(undefined) // undefined = checking, null = logged out
  const [isDark, setIsDark] = useState(true)
  const [routines, setRoutines] = useState([])
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [drafts, setDrafts] = useState({}) // { [exerciseId]: { weight, reps, note } }

  const [editingRoutineId, setEditingRoutineId] = useState(null)
  const [isAddingRoutine, setIsAddingRoutine] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Rest timer — a single active timer at a time, tied to whichever exercise
  // it belongs to. Logging any set overwrites it (per spec: "restarting a
  // new set should reset and overwrite the timer").
  const [activeTimer, setActiveTimer] = useState(null) // { exerciseId, duration, endTime }
  const [remaining, setRemaining] = useState(0)
  const [restSound, setRestSound] = useState(loadRestSoundPreference)
  const audioRef = useRef(null)

  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false)
  const [addingSetExerciseId, setAddingSetExerciseId] = useState(null)

  const user = authSession?.user ?? null

  const toaster = (
    <Toaster
      position="top-center"
      toastOptions={{
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
      }}
    />
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Merely changing the `src` attribute on a mounted <audio> element doesn't
  // reliably reload the resource in every browser — force it explicitly
  // whenever the user picks a different rest sound.
  useEffect(() => {
    audioRef.current?.load()
  }, [restSound])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuthSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load everything from Supabase once we know who's signed in.
  useEffect(() => {
    if (!user) {
      setRoutines([])
      setHistory([])
      setActiveSession(null)
      setDataLoading(false)
      return
    }

    let cancelled = false
    setDataLoading(true)

    async function loadData() {
      const [routinesRes, activeRes, historyRes] = await Promise.all([
        supabase
          .from('routines')
          .select('id, name, exercises(id, name, rest_time, created_at)')
          .order('created_at'),
        supabase.from('sessions').select('*').eq('status', 'active').maybeSingle(),
        supabase
          .from('sessions')
          .select('*')
          .eq('status', 'completed')
          .order('date', { ascending: false }),
      ])

      if (cancelled) return

      if (routinesRes.error) console.error(routinesRes.error)
      if (activeRes.error) console.error(activeRes.error)
      if (historyRes.error) console.error(historyRes.error)

      setRoutines((routinesRes.data ?? []).map(mapRoutineRow))
      setActiveSession(activeRes.data ? mapSessionRow(activeRes.data) : null)
      setHistory((historyRes.data ?? []).map(mapSessionRow))
      setDataLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!activeTimer) return
    let intervalId

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000))
      setRemaining(secondsLeft)
      if (secondsLeft <= 0) {
        clearInterval(intervalId)
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch((e) => console.log('Playback failed:', e))
        }
        setActiveTimer(null)
      }
    }

    tick()
    intervalId = setInterval(tick, 250)
    return () => clearInterval(intervalId)
  }, [activeTimer])

  const previousRecords = useMemo(() => {
    const map = {}
    for (const ex of activeSession?.exercises ?? []) {
      map[ex.exerciseName] = findPreviousExercise(history, ex.exerciseName)
    }
    return map
  }, [history, activeSession])

  function getDraft(exerciseId) {
    return drafts[exerciseId] || EMPTY_DRAFT
  }

  function updateDraft(exerciseId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] || EMPTY_DRAFT), [field]: value },
    }))
  }

  function logSupabaseError(error, message = 'خطایی رخ داد. دوباره تلاش کنید') {
    if (error) {
      console.error(error)
      toast.error(message)
    }
  }

  // --- Auth -----------------------------------------------------------------

  function handleLogout() {
    setIsSettingsOpen(false)
    supabase.auth.signOut()
  }

  // --- Routine CRUD (home screen) ------------------------------------------

  async function handleCreateRoutine(name) {
    setIsCreatingRoutine(true)
    const id = crypto.randomUUID()
    const { error } = await supabase.from('routines').insert({ id, user_id: user.id, name })
    setIsCreatingRoutine(false)

    if (error) {
      logSupabaseError(error, 'خطا در ایجاد برنامه')
      return
    }

    setRoutines((prev) => [...prev, { id, name, exercises: [] }])
    setIsAddingRoutine(false)
    toast.success('برنامه ایجاد شد')
  }

  function handleRenameRoutine(routineId, name) {
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, name } : r)))
    setEditingRoutineId(null)

    supabase
      .from('routines')
      .update({ name })
      .eq('id', routineId)
      .then(({ error }) => logSupabaseError(error))
  }

  function handleDeleteRoutine(routineId, routineName) {
    if (!window.confirm(`برنامه «${routineName}» حذف شود؟`)) return

    setRoutines((prev) => prev.filter((r) => r.id !== routineId))

    supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .then(({ error }) => {
        logSupabaseError(error)
        if (!error) toast.success('برنامه حذف شد')
      })
  }

  function handleStartRoutine(routine) {
    const id = crypto.randomUUID()
    const date = new Date().toISOString()
    const exercises = routine.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      restTime: ex.restTime || 0,
      sets: [],
    }))

    setDrafts({})
    setActiveTimer(null)
    setActiveSession({ id, routineId: routine.id, routineName: routine.name, date, exercises })

    supabase
      .from('sessions')
      .insert({
        id,
        user_id: user.id,
        routine_id: routine.id,
        routine_name: routine.name,
        status: 'active',
        date,
        exercises,
      })
      .then(({ error }) => logSupabaseError(error))
  }

  // --- Exercise CRUD (inside workout view) ---------------------------------

  function handleAddExercise({ name, restTime }) {
    const newExercise = { id: crypto.randomUUID(), name, restTime }

    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId ? { ...r, exercises: [...r.exercises, newExercise] } : r
      )
    )

    const updatedExercises = [
      ...activeSession.exercises,
      { exerciseId: newExercise.id, exerciseName: name, restTime, sets: [] },
    ]
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setIsAddingExercise(false)

    supabase
      .from('exercises')
      .insert({
        id: newExercise.id,
        routine_id: activeSession.routineId,
        user_id: user.id,
        name,
        rest_time: restTime,
      })
      .then(({ error }) => {
        logSupabaseError(error)
        if (!error) toast.success('حرکت اضافه شد')
      })

    supabase
      .from('sessions')
      .update({ exercises: updatedExercises })
      .eq('id', activeSession.id)
      .then(({ error }) => logSupabaseError(error))
  }

  function handleRenameExercise(exerciseId, { name, restTime }) {
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId
          ? {
              ...r,
              exercises: r.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, name, restTime } : ex
              ),
            }
          : r
      )
    )

    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, exerciseName: name, restTime } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setEditingExerciseId(null)

    supabase
      .from('exercises')
      .update({ name, rest_time: restTime })
      .eq('id', exerciseId)
      .then(({ error }) => logSupabaseError(error))

    supabase
      .from('sessions')
      .update({ exercises: updatedExercises })
      .eq('id', activeSession.id)
      .then(({ error }) => logSupabaseError(error))
  }

  function handleDeleteExercise(exerciseId, exerciseName) {
    if (!window.confirm(`حرکت «${exerciseName}» از این برنامه حذف شود؟`)) return

    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId
          ? { ...r, exercises: r.exercises.filter((ex) => ex.id !== exerciseId) }
          : r
      )
    )

    const updatedExercises = activeSession.exercises.filter((ex) => ex.exerciseId !== exerciseId)
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    if (activeTimer?.exerciseId === exerciseId) setActiveTimer(null)

    supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId)
      .then(({ error }) => {
        logSupabaseError(error)
        if (!error) toast.success('حرکت حذف شد')
      })

    supabase
      .from('sessions')
      .update({ exercises: updatedExercises })
      .eq('id', activeSession.id)
      .then(({ error }) => logSupabaseError(error))
  }

  // --- Set logging -----------------------------------------------------------

  async function handleAddSet(exerciseId, e) {
    e.preventDefault()
    // Unlocks the <audio> element for iOS Safari — must run synchronously
    // inside this real user-gesture handler, not inside a timer callback.
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => audioRef.current.pause())
        .catch((e) => console.log('Unlock failed:', e))
    }
    const draft = getDraft(exerciseId)
    if (!(Number(draft.weight) > 0 && Number(draft.reps) > 0)) return

    const exercise = activeSession.exercises.find((ex) => ex.exerciseId === exerciseId)

    const newSet = {
      id: crypto.randomUUID(),
      weight: Number(draft.weight),
      reps: Number(draft.reps),
      note: draft.note.trim(),
      timestamp: Date.now(),
    }

    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, sets: [...ex.sets, newSet] } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setDrafts((prev) => ({ ...prev, [exerciseId]: EMPTY_DRAFT }))

    const restTime = Number(exercise?.restTime) || 0
    if (restTime > 0) {
      setActiveTimer({ exerciseId, duration: restTime, endTime: Date.now() + restTime * 1000 })
    }

    setAddingSetExerciseId(exerciseId)
    const { error } = await supabase
      .from('sessions')
      .update({ exercises: updatedExercises })
      .eq('id', activeSession.id)
    setAddingSetExerciseId(null)

    if (error) {
      logSupabaseError(error, 'ذخیره ست در فضای ابری ناموفق بود')
      return
    }
    toast.success('ست در فضای ابری ذخیره شد')
  }

  function handleDeleteSet(exerciseId, setId) {
    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })

    supabase
      .from('sessions')
      .update({ exercises: updatedExercises })
      .eq('id', activeSession.id)
      .then(({ error }) => logSupabaseError(error))
  }

  function handleFinishWorkout() {
    const loggedExercises = activeSession.exercises.filter((ex) => ex.sets.length > 0)
    const sessionId = activeSession.id

    if (loggedExercises.length > 0) {
      setHistory((prev) => [{ ...activeSession, exercises: loggedExercises }, ...prev])
      supabase
        .from('sessions')
        .update({ exercises: loggedExercises, status: 'completed' })
        .eq('id', sessionId)
        .then(({ error }) => {
          logSupabaseError(error)
          if (!error) toast.success('تمرین ذخیره شد')
        })
    } else {
      supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .then(({ error }) => logSupabaseError(error))
    }

    setActiveSession(null)
    setDrafts({})
    setIsAddingExercise(false)
    setEditingExerciseId(null)
    setActiveTimer(null)
  }

  function handleClearAllData() {
    const confirmed = window.confirm(
      'آیا مطمئن هستید؟ تمام برنامه‌ها و رکوردهای شما حذف خواهد شد.'
    )
    if (!confirmed) return

    setRoutines([])
    setHistory([])
    setActiveSession(null)
    setDrafts({})
    setActiveTimer(null)
    setEditingRoutineId(null)
    setIsAddingRoutine(false)
    setEditingExerciseId(null)
    setIsAddingExercise(false)
    setIsSettingsOpen(false)
    setIsDark(true)

    Promise.all([
      supabase.from('sessions').delete().eq('user_id', user.id),
      supabase.from('exercises').delete().eq('user_id', user.id),
      supabase.from('routines').delete().eq('user_id', user.id),
    ]).then((results) => {
      results.forEach(({ error }) => logSupabaseError(error))
      if (results.every(({ error }) => !error)) toast.success('تمام اطلاعات پاک شد')
    })
  }

  const darkToggleButton = (
    <button
      type="button"
      onClick={() => setIsDark((d) => !d)}
      className="rounded-full bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    >
      {isDark ? 'حالت روشن' : 'حالت تاریک'}
    </button>
  )

  const settingsButton = (
    <button
      type="button"
      onClick={() => setIsSettingsOpen(true)}
      aria-label="تنظیمات"
      title="تنظیمات"
      className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-purple-600 dark:hover:bg-gray-800"
    >
      <Icon name="settings" className="text-[20px]" />
    </button>
  )

  const settingsModal = isSettingsOpen && (
    <SettingsModal
      onClose={() => setIsSettingsOpen(false)}
      onClearData={handleClearAllData}
      onLogout={handleLogout}
      userEmail={user?.email}
      restSound={restSound}
      onRestSoundChange={(sound) => {
        setRestSound(sound)
        saveRestSoundPreference(sound)
      }}
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
  if (dataLoading)
    return (
      <>
        {toaster}
        <LoadingScreen />
      </>
    )

  // --- Home screen ------------------------------------------------------------

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {toaster}
        {settingsModal}
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">جیم برو</h1>
            <div className="flex items-center gap-2">
              {settingsButton}
              {darkToggleButton}
            </div>
          </header>

          <section>
            <h2 className="mb-4 text-lg font-bold">برنامه امروز رو انتخاب کن</h2>
            <div className="flex flex-col gap-3">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
                >
                  {editingRoutineId === routine.id ? (
                    <NameEditRow
                      initialValue={routine.name}
                      onSave={(name) => handleRenameRoutine(routine.id, name)}
                      onCancel={() => setEditingRoutineId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartRoutine(routine)}
                        className="flex-1 truncate py-2 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
                      >
                        {routine.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoutineId(routine.id)}
                        aria-label="ویرایش نام برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                        aria-label="حذف برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                      >
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isAddingRoutine ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                  <NameEditRow
                    initialValue=""
                    placeholder="مثلاً Push Day"
                    onSave={handleCreateRoutine}
                    onCancel={() => setIsAddingRoutine(false)}
                    isSaving={isCreatingRoutine}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingRoutine(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-lg font-bold text-gray-500 transition hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
                >
                  <Icon name="add" className="text-[22px]" />
                  ایجاد برنامه جدید
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }

  // --- Workout view -------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toaster}
      {settingsModal}
      <audio ref={audioRef} src={`/sounds/${restSound}`} preload="auto" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 dark:text-gray-400">برنامه</span>
            <h1 className="text-2xl font-bold">{activeSession.routineName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {settingsButton}
            {darkToggleButton}
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {activeSession.exercises.map((ex, index) => {
            const draft = getDraft(ex.exerciseId)
            const previous = previousRecords[ex.exerciseName]
            const canSubmit = Number(draft.weight) > 0 && Number(draft.reps) > 0
            const isSubmittingSet = addingSetExerciseId === ex.exerciseId

            return (
              <div
                key={ex.exerciseId}
                className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
              >
                {editingExerciseId === ex.exerciseId ? (
                  <div className="mb-3">
                    <ExerciseEditRow
                      initialName={ex.exerciseName}
                      initialRestTime={ex.restTime}
                      onSave={(data) => handleRenameExercise(ex.exerciseId, data)}
                      onCancel={() => setEditingExerciseId(null)}
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex items-center gap-1">
                      <h3 className="flex-1 truncate text-lg font-bold">{ex.exerciseName}</h3>
                      <button
                        type="button"
                        onClick={() => setEditingExerciseId(ex.exerciseId)}
                        aria-label="ویرایش نام حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.exerciseId, ex.exerciseName)}
                        aria-label="حذف حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                    {ex.restTime > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        استراحت پیش‌فرض: {ex.restTime} ثانیه
                      </p>
                    )}
                  </div>
                )}

                {previous && (
                  <div className="mb-3 rounded-xl border border-purple-300 bg-purple-50 p-3 dark:border-purple-500/30 dark:bg-purple-500/10">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        رکورد جلسه قبل
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSessionDate(previous.session.date)}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {previous.exercise.sets.map((set, i) => (
                        <li key={set.id} className="text-sm text-gray-700 dark:text-gray-300">
                          ست {i + 1}: {set.weight} kg × {set.reps} تکرار
                          {set.note && (
                            <span className="text-gray-500 dark:text-gray-400"> — {set.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form
                  onSubmit={(e) => handleAddSet(ex.exerciseId, e)}
                  className="flex flex-col gap-3"
                >
                  <div className="flex gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <label
                        htmlFor={`weight-${index}`}
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        وزنه (kg)
                      </label>
                      <input
                        id={`weight-${index}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="۰"
                        value={draft.weight}
                        onChange={(e) =>
                          updateDraft(
                            ex.exerciseId,
                            'weight',
                            sanitizeNumericInput(e.target.value, { allowDecimal: true })
                          )
                        }
                        className="w-full min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <label
                        htmlFor={`reps-${index}`}
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        تکرار
                      </label>
                      <input
                        id={`reps-${index}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="۰"
                        value={draft.reps}
                        onChange={(e) =>
                          updateDraft(ex.exerciseId, 'reps', sanitizeNumericInput(e.target.value))
                        }
                        className="w-full min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`note-${index}`}
                      className="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      یادداشت <span className="text-gray-400 dark:text-gray-500">(اختیاری)</span>
                    </label>
                    <input
                      id={`note-${index}`}
                      type="text"
                      inputMode="text"
                      placeholder="مثلاً ست اضافی یا مکث دو ثانیه"
                      value={draft.note}
                      onChange={(e) => updateDraft(ex.exerciseId, 'note', e.target.value)}
                      className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmittingSet}
                    className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                  >
                    {isSubmittingSet && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent dark:border-gray-500" />
                    )}
                    {isSubmittingSet ? 'در حال ثبت...' : 'ثبت ست'}
                  </button>
                </form>

                {activeTimer?.exerciseId === ex.exerciseId && (
                  <div className="mt-3 rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        استراحت
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400">
                          {formatTime(remaining)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTimer(null)}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <Icon name="close" className="text-[16px]" />
                          لغو
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-[width] duration-300 ease-linear"
                        style={{ width: `${(remaining / activeTimer.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {ex.sets.length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-gray-100 border-t border-gray-100 pt-2 dark:divide-gray-800 dark:border-gray-800">
                    {ex.sets.map((set, i) => (
                      <li
                        key={set.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-800 dark:text-gray-200">
                            ست {i + 1}: {set.weight} kg × {set.reps} تکرار
                          </span>
                          {set.note && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {set.note}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(ex.exerciseId, set.id)}
                          aria-label="حذف ست"
                          className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                        >
                          <Icon name="close" className="text-[18px]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}

          {isAddingExercise ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <ExerciseEditRow
                initialName=""
                initialRestTime={0}
                onSave={handleAddExercise}
                onCancel={() => setIsAddingExercise(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingExercise(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-lg font-bold text-gray-500 transition hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
            >
              <Icon name="add" className="text-[22px]" />
              افزودن حرکت
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinishWorkout}
          className="mt-6 rounded-xl border-2 border-red-500 py-4 text-lg font-bold text-red-500 transition active:scale-95 dark:border-red-500/70 dark:text-red-400"
        >
          پایان تمرین
        </button>
      </div>
    </div>
  )
}

export default App
