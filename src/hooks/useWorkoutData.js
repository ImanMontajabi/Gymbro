import { useEffect, useMemo, useState } from 'react'
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
  const [routines, setRoutines] = useState([])
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(null)
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

  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false)
  const [addingSetExerciseId, setAddingSetExerciseId] = useState(null)

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
      sets: [],
    }))

    setDrafts({})
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

    writeMutation({
      table: 'exercises',
      type: 'insert',
      payload: {
        id: newExercise.id,
        routine_id: activeSession.routineId,
        user_id: user.id,
        name,
        rest_time: restTime,
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

    writeMutation({
      table: 'exercises',
      type: 'update',
      payload: { name, rest_time: restTime },
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
    if (!(Number(draft.weight) > 0 && Number(draft.reps) > 0)) return

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
    setIsAddingExercise(false)
    setEditingExerciseId(null)
    timer.cancelTimer()
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
  }
}
