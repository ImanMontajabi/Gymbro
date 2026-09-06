import { useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { findPreviousExercise } from '../utils/history'

const EMPTY_DRAFT = { weight: '', reps: '', note: '' }

// Persists in-progress (unsubmitted) set inputs so a PWA suspend/resume
// cycle — e.g. switching to a music app and coming back — doesn't wipe out
// text the user already typed but hadn't submitted yet.
const DRAFTS_STORAGE_KEY = 'gymbro_drafts'

function loadStoredDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Crash recovery for the in-progress workout. Mobile OSes kill a backgrounded
// PWA tab freely (more so now that the app no longer holds a wake lock), and
// the hard reload that follows loses all React state. Supabase can't be
// relied on to restore it: the initial load fails outright when the phone is
// offline in the gym, and even online it races the offline write queue's
// replay, so the server copy can lag behind sets that were logged locally.
// The local copy is therefore always at least as fresh as the server's, and
// is what the reload restores from. Shape: { userId, activeSession,
// activeExerciseId } — `userId` so a session cached by one account is never
// resurrected for a different account signing in on the same device.
const ACTIVE_WORKOUT_STORAGE_KEY = 'gymbro_active_workout'

function loadStoredWorkout() {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Reject anything that isn't the expected shape (corrupt write, an older
    // deploy's format, hand-edited storage) rather than letting it crash the
    // workout view on mount.
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.userId !== 'string' ||
      !parsed.activeSession ||
      typeof parsed.activeSession !== 'object' ||
      !Array.isArray(parsed.activeSession.exercises)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveStoredWorkout(data) {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (private mode, quota) — the session still
    // works for this tab's lifetime, it just won't survive a tab kill.
  }
}

function clearStoredWorkout() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  } catch {
    // ignore — same as above
  }
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
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        restTime: ex.rest_time,
        isTimeBased: ex.is_time_based ?? false,
      })),
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

function logSupabaseError(error, message = 'خطایی رخ داد. دوباره تلاش کنید') {
  if (error) {
    console.error(error)
    toast.error(message)
  }
}

// Owns all Supabase-backed workout state — routines, completed-session
// history, the in-progress session, and every CRUD action that mutates
// them.
//
// `timer` (from useRestTimer) is started/cancelled alongside set/exercise
// mutations. `onDataCleared` lets the caller also reset cross-cutting UI
// (dark mode) when "Clear All Data" runs — everything else that action
// resets lives in this hook. `writeMutation` (from useMutationQueue) is
// used for every write below instead of calling `supabase` directly, so
// each one is automatically queued and replayed later if offline.
export function useWorkoutData({ user, timer, onDataCleared, writeMutation }) {
  const userId = user?.id ?? null

  // Read once on mount. Whether the cached session actually belongs to the
  // account that ends up signed in can't be known yet (auth is still
  // resolving on first render), so it's restored optimistically here and
  // the load effect below discards it if the owner turns out to differ.
  const [restored] = useState(loadStoredWorkout)

  const [routines, setRoutines] = useState([])
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(() => restored?.activeSession ?? null)
  const [dataLoading, setDataLoading] = useState(true)
  const [drafts, setDrafts] = useState(loadStoredDrafts) // { [exerciseId]: { weight, reps, note } }

  // Mirror every draft change to localStorage so it survives a suspend/kill.
  useEffect(() => {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  }, [drafts])

  const [editingRoutineId, setEditingRoutineId] = useState(null)
  const [isAddingRoutine, setIsAddingRoutine] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [isAddingExercise, setIsAddingExercise] = useState(false)

  // Focus Mode: which exercise is expanded for data entry in WorkoutTab.
  // Lives here (not as local state in WorkoutTab) because Dashboard in
  // App.jsx unmounts WorkoutTab whenever the user switches to the
  // History/Coach tab — a local useState would reset to null on that
  // unmount, collapsing the expanded card every time the user navigated
  // away and back.
  const [activeExerciseId, setActiveExerciseId] = useState(
    () => restored?.activeExerciseId ?? null
  )

  // Mirror the in-progress workout to localStorage on every change (a set
  // logged, an exercise expanded/added/renamed...). A null session means the
  // workout ended — finished, cleared, discarded as another account's, or
  // the user logged out — and that's the single place the cache is removed,
  // so no terminating code path can forget to. While auth is still
  // resolving (`userId` null) a restored session is left as-is in storage
  // rather than re-saved without an owner.
  useEffect(() => {
    if (!activeSession) {
      clearStoredWorkout()
      return
    }
    if (!userId) return
    saveStoredWorkout({ userId, activeSession, activeExerciseId })
  }, [userId, activeSession, activeExerciseId])

  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false)
  const [addingSetExerciseId, setAddingSetExerciseId] = useState(null)

  // `user` is null both while auth is still resolving on first render AND
  // after a real logout. Only the latter should wipe state — on the initial
  // pass, nulling `activeSession` would also erase the crash-recovery cache
  // (via the sync effect above) before auth even had a chance to restore it.
  const hadUserRef = useRef(false)

  // Load everything from Supabase once we know who's signed in.
  //
  // Keyed on `userId`, not the `user` object: supabase auth-js refreshes the
  // token when the tab becomes visible again and emits a *new* session
  // object each time, so depending on `user` re-ran this whole load — with
  // a LoadingScreen flash and a server-copy overwrite of the live session —
  // every time the user came back to the app. The data only needs
  // re-fetching when the *account* changes.
  useEffect(() => {
    if (!userId) {
      if (hadUserRef.current) {
        setRoutines([])
        setHistory([])
        setActiveSession(null)
        setActiveExerciseId(null)
      }
      setDataLoading(false)
      return
    }
    hadUserRef.current = true

    // The cached session was written by a different account on this device
    // — never show one user's workout to another.
    if (restored && restored.userId !== userId) {
      setActiveSession(null)
      setActiveExerciseId(null)
    }

    let cancelled = false
    setDataLoading(true)

    async function loadData() {
      const [routinesRes, activeRes, historyRes] = await Promise.all([
        supabase
          .from('routines')
          .select('id, name, exercises(id, name, rest_time, is_time_based, created_at)')
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
      setHistory((historyRes.data ?? []).map(mapSessionRow))
      // The locally cached session wins over the server's: every mutation
      // updates local state before (or, when offline, instead of) reaching
      // Supabase, so the local copy is never behind — and if this load
      // failed outright (offline), the server "copy" is just an error. The
      // server is only consulted when there's nothing cached, e.g. first
      // run after this deploy, or storage being unavailable.
      setActiveSession(
        (current) => current ?? (activeRes.data ? mapSessionRow(activeRes.data) : null)
      )
      setDataLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [userId, restored])

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

  // --- Routine CRUD (home screen) ------------------------------------------

  async function handleCreateRoutine(name) {
    setIsCreatingRoutine(true)
    const id = crypto.randomUUID()
    const { error, queued } = await writeMutation({
      table: 'routines',
      type: 'insert',
      payload: { id, user_id: user.id, name },
    })
    setIsCreatingRoutine(false)

    if (error) {
      logSupabaseError(error, 'خطا در ایجاد برنامه')
      return
    }

    setRoutines((prev) => [...prev, { id, name, exercises: [] }])
    setIsAddingRoutine(false)
    if (queued) return
    toast.success('برنامه ایجاد شد')
  }

  function handleRenameRoutine(routineId, name) {
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, name } : r)))
    setEditingRoutineId(null)

    writeMutation({
      table: 'routines',
      type: 'update',
      payload: { name },
      match: { column: 'id', value: routineId },
    }).then(({ error }) => logSupabaseError(error))
  }

  function handleDeleteRoutine(routineId, routineName) {
    if (!window.confirm(`برنامه «${routineName}» حذف شود؟`)) return

    setRoutines((prev) => prev.filter((r) => r.id !== routineId))

    writeMutation({
      table: 'routines',
      type: 'delete',
      match: { column: 'id', value: routineId },
    }).then(({ error, queued }) => {
      logSupabaseError(error)
      if (!error && !queued) toast.success('برنامه حذف شد')
    })
  }

  function handleStartRoutine(routine) {
    const id = crypto.randomUUID()
    const date = new Date().toISOString()
    const exercises = routine.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      restTime: ex.restTime || 0,
      isTimeBased: !!ex.isTimeBased,
      sets: [],
    }))

    setDrafts({})
    setActiveExerciseId(null)
    timer.cancelTimer()
    setActiveSession({ id, routineId: routine.id, routineName: routine.name, date, exercises })

    writeMutation({
      table: 'sessions',
      type: 'insert',
      payload: {
        id,
        user_id: user.id,
        routine_id: routine.id,
        routine_name: routine.name,
        status: 'active',
        date,
        exercises,
      },
    }).then(({ error }) => logSupabaseError(error))
  }

  // --- Exercise CRUD (inside workout view) ---------------------------------

  function handleAddExercise({ name, restTime, isTimeBased = false }) {
    const newExercise = { id: crypto.randomUUID(), name, restTime, isTimeBased }

    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId ? { ...r, exercises: [...r.exercises, newExercise] } : r
      )
    )

    const updatedExercises = [
      ...activeSession.exercises,
      { exerciseId: newExercise.id, exerciseName: name, restTime, isTimeBased, sets: [] },
    ]
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setIsAddingExercise(false)

    writeMutation({
      table: 'exercises',
      type: 'insert',
      payload: {
        id: newExercise.id,
        routine_id: activeSession.routineId,
        user_id: user.id,
        name,
        rest_time: restTime,
        is_time_based: isTimeBased,
      },
    }).then(({ error, queued }) => {
      logSupabaseError(error)
      if (!error && !queued) toast.success('حرکت اضافه شد')
    })

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
  }

  function handleRenameExercise(exerciseId, { name, restTime, isTimeBased = false }) {
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId
          ? {
              ...r,
              exercises: r.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, name, restTime, isTimeBased } : ex
              ),
            }
          : r
      )
    )

    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, exerciseName: name, restTime, isTimeBased } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setEditingExerciseId(null)

    writeMutation({
      table: 'exercises',
      type: 'update',
      payload: { name, rest_time: restTime, is_time_based: isTimeBased },
      match: { column: 'id', value: exerciseId },
    }).then(({ error }) => logSupabaseError(error))

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
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
    setActiveExerciseId((prev) => (prev === exerciseId ? null : prev))
    timer.cancelIfMatches(exerciseId)

    writeMutation({
      table: 'exercises',
      type: 'delete',
      match: { column: 'id', value: exerciseId },
    }).then(({ error, queued }) => {
      logSupabaseError(error)
      if (!error && !queued) toast.success('حرکت حذف شد')
    })

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
  }

  // --- Set logging -----------------------------------------------------------

  async function handleAddSet(exerciseId, e) {
    e.preventDefault()
    const draft = getDraft(exerciseId)
    // Weight 0 is a valid bodyweight set, but must be typed explicitly (not
    // an empty field); reps/seconds must be positive. Same rule as the
    // submit button's `canSubmit` in WorkoutTab.
    const hasValidWeight = draft.weight !== '' && Number(draft.weight) >= 0
    if (!(hasValidWeight && Number(draft.reps) > 0)) return

    // handleEditSet marks the draft it populates as `isEditing` — submitting
    // that draft is fixing up a set that already happened, not logging a
    // new one, so the rest timer must be left exactly as it is.
    const isEditResubmit = draft.isEditing === true

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
    if (restTime > 0 && !isEditResubmit) {
      timer.startTimer(exerciseId, restTime)
    }

    setAddingSetExerciseId(exerciseId)
    const { error, queued } = await writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    })
    setAddingSetExerciseId(null)

    if (error) {
      logSupabaseError(error, 'ذخیره ست در فضای ابری ناموفق بود')
      return
    }
    if (!queued) toast.success('ست در فضای ابری ذخیره شد')
  }

  function handleDeleteSet(exerciseId, setId) {
    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
  }

  // Pulls a logged set back out of the list and into the input fields so the
  // user can correct it — it's removed from `sets` (not just displayed for
  // edit) so re-submitting doesn't create a duplicate; if they cancel by
  // navigating away, it stays gone rather than silently reappearing.
  // `isEditing: true` marks the draft so handleAddSet knows this submission
  // is correcting an existing set, not logging a new one — see its comment.
  function handleEditSet(exerciseId, setId) {
    const exercise = activeSession.exercises.find((ex) => ex.exerciseId === exerciseId)
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return

    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })
    setDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        weight: String(set.weight),
        reps: String(set.reps),
        note: set.note || '',
        isEditing: true,
      },
    }))

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
  }

  // Called from a dnd-kit `onDragEnd` handler with the dragged set's id and
  // the id of the set it was dropped on.
  function handleReorderSets(exerciseId, activeSetId, overSetId) {
    if (activeSetId === overSetId) return

    const exercise = activeSession.exercises.find((ex) => ex.exerciseId === exerciseId)
    if (!exercise) return

    const oldIndex = exercise.sets.findIndex((s) => s.id === activeSetId)
    const newIndex = exercise.sets.findIndex((s) => s.id === overSetId)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedSets = arrayMove(exercise.sets, oldIndex, newIndex)

    const updatedExercises = activeSession.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, sets: reorderedSets } : ex
    )
    setActiveSession({ ...activeSession, exercises: updatedExercises })

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))
  }

  function handleFinishWorkout() {
    const loggedExercises = activeSession.exercises.filter((ex) => ex.sets.length > 0)
    const sessionId = activeSession.id

    if (loggedExercises.length > 0) {
      setHistory((prev) => [{ ...activeSession, exercises: loggedExercises }, ...prev])
      writeMutation({
        table: 'sessions',
        type: 'update',
        payload: { exercises: loggedExercises, status: 'completed' },
        match: { column: 'id', value: sessionId },
      }).then(({ error, queued }) => {
        logSupabaseError(error)
        if (!error && !queued) toast.success('تمرین ذخیره شد')
      })
    } else {
      writeMutation({
        table: 'sessions',
        type: 'delete',
        match: { column: 'id', value: sessionId },
      }).then(({ error }) => logSupabaseError(error))
    }

    setActiveSession(null)
    setDrafts({})
    setActiveExerciseId(null)
    setIsAddingExercise(false)
    setEditingExerciseId(null)
    timer.cancelTimer()
  }

  // --- Past-session editing (History tab) -----------------------------------
  //
  // Deliberately separate from every set/exercise handler above: this only
  // ever reads/writes the `history` array and the one `sessions` row it
  // targets by id. It never touches `activeSession`, so editing a past
  // workout — even one for the same routine as an in-progress session —
  // cannot corrupt or interfere with the live workout in any way.
  // Doesn't toast itself (unlike the handlers above) — the caller (the
  // History edit modal) is language-aware via useLanguage() and shows its
  // own success/error toast in the active UI language.
  async function handleUpdateHistorySession(sessionId, updatedExercises) {
    const { error } = await writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: sessionId },
    })

    if (error) {
      console.error(error)
      return { error }
    }

    setHistory((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, exercises: updatedExercises } : session
      )
    )
    return { error: null }
  }

  // Same isolation as handleUpdateHistorySession: only `history` and the
  // one `sessions` row are touched, never `activeSession`. The confirm
  // dialog and toasts belong to the caller (HistoryTab) so they can be
  // shown in the active UI language. Routed through the offline queue like
  // every other single-row write, so it works in the gym without signal.
  async function handleDeleteHistorySession(sessionId) {
    const { error } = await writeMutation({
      table: 'sessions',
      type: 'delete',
      match: { column: 'id', value: sessionId },
    })

    if (error) {
      console.error(error)
      return { error }
    }

    setHistory((prev) => prev.filter((session) => session.id !== sessionId))
    return { error: null }
  }

  // Deliberately NOT routed through the offline queue: queuing a "wipe
  // everything" mutation would risk it firing later and deleting workouts
  // logged in the meantime, in an unpredictable order relative to those
  // writes. It's rare and destructive enough to just require a live
  // connection.
  function handleClearAllData() {
    if (!navigator.onLine) {
      toast.error('برای پاک کردن اطلاعات به اینترنت متصل شوید')
      return
    }

    const confirmed = window.confirm(
      'آیا مطمئن هستید؟ تمام برنامه‌ها و رکوردهای شما حذف خواهد شد.'
    )
    if (!confirmed) return

    setRoutines([])
    setHistory([])
    setActiveSession(null)
    setDrafts({})
    setActiveExerciseId(null)
    timer.cancelTimer()
    setEditingRoutineId(null)
    setIsAddingRoutine(false)
    setEditingExerciseId(null)
    setIsAddingExercise(false)
    onDataCleared?.()

    Promise.all([
      supabase.from('sessions').delete().eq('user_id', user.id),
      supabase.from('exercises').delete().eq('user_id', user.id),
      supabase.from('routines').delete().eq('user_id', user.id),
    ]).then((results) => {
      results.forEach(({ error }) => logSupabaseError(error))
      if (results.every(({ error }) => !error)) toast.success('تمام اطلاعات پاک شد')
    })
  }

  return {
    routines,
    history,
    activeSession,
    dataLoading,
    previousRecords,
    getDraft,
    updateDraft,
    editingRoutineId,
    setEditingRoutineId,
    isAddingRoutine,
    setIsAddingRoutine,
    editingExerciseId,
    setEditingExerciseId,
    isAddingExercise,
    setIsAddingExercise,
    activeExerciseId,
    setActiveExerciseId,
    isCreatingRoutine,
    addingSetExerciseId,
    handleCreateRoutine,
    handleRenameRoutine,
    handleDeleteRoutine,
    handleStartRoutine,
    handleAddExercise,
    handleRenameExercise,
    handleDeleteExercise,
    handleAddSet,
    handleDeleteSet,
    handleEditSet,
    handleReorderSets,
    handleFinishWorkout,
    handleClearAllData,
    handleUpdateHistorySession,
    handleDeleteHistorySession,
  }
}
