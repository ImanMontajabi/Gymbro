import { useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { findPreviousExercise } from '../utils/history'
import { useLanguage } from '../context/LanguageContext'
import { clearStoredWorkout, loadStoredWorkout, saveStoredWorkout } from '../utils/activeWorkoutStorage'

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

// Closes an `active` sessions row the server still holds but this device no
// longer treats as in progress — a finish/cancel whose write never landed.
// Same rules as handleFinishWorkout: with logged sets it becomes a completed
// history entry (empty exercises stripped), otherwise it is deleted. Returns
// `saved` (the history entry) when it was completed, so the caller can add
// it to local history and tell the user.
async function closeStaleServerSession(row, writeMutation) {
  const session = mapSessionRow(row)
  const loggedExercises = session.exercises.filter((ex) => ex.sets?.length > 0)
  if (loggedExercises.length === 0) {
    const { error } = await writeMutation({
      table: 'sessions',
      type: 'delete',
      match: { column: 'id', value: session.id },
    })
    return { error, saved: null }
  }
  const { error } = await writeMutation({
    table: 'sessions',
    type: 'update',
    payload: { exercises: loggedExercises, status: 'completed' },
    match: { column: 'id', value: session.id },
  })
  return { error, saved: error ? null : { ...session, exercises: loggedExercises } }
}

// Multi-device conflict: this device's cached session lost to a different
// active session on the server (see the load effect). The cached copy is
// never deleted from the server — its row, if it still exists, is a
// completed workout finished on another device. Its logged sets are only
// written back, as a completed entry, when the server has no row for it at
// all (the insert never landed), so nothing another device saved is ever
// overwritten. Returns `saved` when such an entry was written.
async function archiveLocalSession(session, userId, writeMutation) {
  const loggedExercises = session.exercises.filter((ex) => ex.sets?.length > 0)
  if (loggedExercises.length === 0) return { error: null, saved: null }

  const { data, error: lookupError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', session.id)
    .limit(1)
  if (lookupError) return { error: lookupError, saved: null }
  if (data?.length > 0) return { error: null, saved: null }

  const { error } = await writeMutation({
    table: 'sessions',
    type: 'insert',
    payload: {
      id: session.id,
      user_id: userId,
      routine_id: session.routineId,
      routine_name: session.routineName,
      date: session.date,
      exercises: loggedExercises,
      status: 'completed',
    },
  })
  return { error, saved: error ? null : { ...session, exercises: loggedExercises } }
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
export function useWorkoutData({
  user,
  timer,
  onDataCleared,
  writeMutation,
  dropQueuedSessionMutations,
  clearQueue,
}) {
  const userId = user?.id ?? null

  // `t` is read through a ref inside the load effect so a language switch
  // doesn't count as a dependency change and re-fetch everything.
  const { t } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t

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

  // Latest session for async code (the load below) that must not close
  // over a stale render.
  const activeSessionRef = useRef(activeSession)
  activeSessionRef.current = activeSession

  // Id of the session this device most recently finished or cancelled.
  // Lets handleStartRoutine tell "my own close never reached the server"
  // (safe to close and retry) apart from "another device has a live
  // workout" (must be adopted, never closed).
  const lastClosedSessionIdRef = useRef(null)

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
    const localActive = restored && restored.userId !== userId ? null : activeSessionRef.current

    let cancelled = false
    setDataLoading(true)

    async function loadData() {
      const [routinesRes, activeRes, historyRes] = await Promise.all([
        supabase
          .from('routines')
          .select('id, name, exercises(id, name, rest_time, is_time_based, created_at)')
          .order('created_at'),
        // Newest active session, as a 1-row list rather than .maybeSingle():
        // maybeSingle() throws PGRST116 if more than one row matches, and
        // duplicate active rows *have* happened (an offline reload followed
        // by starting a new routine, with the unique index missing). That
        // error used to be treated as "no active session", which sent the
        // user back to the routine list to start yet another one — the
        // duplicates then multiplied on every reload.
        supabase
          .from('sessions')
          .select('*')
          .eq('status', 'active')
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('sessions')
          .select('*')
          .eq('status', 'completed')
          .order('date', { ascending: false }),
      ])

      if (cancelled) return

      // Each query fails independently (offline, a missing column after a
      // deploy without its migration, RLS...). A failed one leaves its
      // state exactly as it was — a fetch error must never look like "you
      // have no routines" — and a single toast says the sync failed. The
      // ones that succeeded still apply, so e.g. history can update even
      // while the routines query is broken.
      if (!routinesRes.error) setRoutines(routinesRes.data.map(mapRoutineRow))
      if (!historyRes.error) setHistory(historyRes.data.map(mapSessionRow))
      // Active session — three cases, written for one account on several
      // devices (the one_active_session_per_user index guarantees the
      // server holds at most one live workout for the account):
      //
      //  1. Nothing cached here: ADOPT the server's session. Setting it as
      //     activeSession also writes it to localStorage through the
      //     persistence effect, so the workout continues on this device.
      //  2. Cached and server agree (same id, or server has none): the
      //     cached copy wins — every mutation updates local state before
      //     (or, offline, instead of) reaching Supabase, so it is never
      //     behind. "Server has none" also covers an insert that never
      //     landed; finish upserts the full row, so nothing is lost.
      //  3. Cached and server hold DIFFERENT sessions: the server wins.
      //     Its session is the live one (started on another device, or on
      //     this one after the cached copy was already finished elsewhere);
      //     the cached copy is stale. It is never deleted from the server —
      //     archiveLocalSession only writes its sets back if the server has
      //     no row for it at all.
      if (!activeRes.error) {
        const serverActive = activeRes.data?.[0] ? mapSessionRow(activeRes.data[0]) : null
        if (!localActive) {
          setActiveSession((current) => current ?? serverActive)
        } else if (serverActive && serverActive.id !== localActive.id) {
          setActiveSession((current) => (current?.id === localActive.id ? serverActive : current))
          setActiveExerciseId(null)
          toast(tRef.current('wtResumedFromServer'))
          archiveLocalSession(localActive, userId, writeMutation).then(({ error, saved }) => {
            logSupabaseError(error)
            if (saved) {
              setHistory((prev) => (prev.some((s) => s.id === saved.id) ? prev : [saved, ...prev]))
              toast(tRef.current('wtStaleSessionSaved'))
            }
          })
        }
      }

      const failures = [routinesRes.error, activeRes.error, historyRes.error].filter(Boolean)
      if (failures.length > 0) {
        failures.forEach((error) => console.error(error))
        toast.error(tRef.current('dataLoadFailed'))
      }
      setDataLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [userId, restored, writeMutation])

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

  async function handleStartRoutine(routine) {
    const id = crypto.randomUUID()
    const date = new Date().toISOString()
    const exercises = routine.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      restTime: ex.restTime || 0,
      isTimeBased: !!ex.isTimeBased,
      completedRests: 0,
      sets: [],
    }))

    setDrafts({})
    setActiveExerciseId(null)
    timer.cancelTimer()
    setActiveSession({ id, routineId: routine.id, routineName: routine.name, date, exercises })

    const insert = {
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
    }
    let { error, queued } = await writeMutation(insert)

    // 23505 = unique_violation on one_active_session_per_user: the server
    // already holds an active session. Two very different situations:
    //  - it is the one this device just finished/cancelled and that close
    //    never landed → close it properly now and retry the insert once;
    //  - anything else is a live workout from another device → adopt it
    //    instead of the routine the user tapped. Never close it.
    // Without this the app used to carry on with a session the server
    // never accepted — every later write targeted a row that didn't exist,
    // and the server's session came back on the next load.
    if (error?.code === '23505') {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: false })
        .limit(1)
      const serverRow = data?.[0]
      if (serverRow && serverRow.id === lastClosedSessionIdRef.current) {
        const closed = await closeStaleServerSession(serverRow, writeMutation)
        if (closed.saved) {
          setHistory((prev) => [closed.saved, ...prev])
          toast(tRef.current('wtStaleSessionSaved'))
        }
        if (!closed.error) ({ error, queued } = await writeMutation(insert))
      } else if (serverRow && serverRow.id !== id) {
        const serverActive = mapSessionRow(serverRow)
        setActiveSession((current) => (current?.id === id ? serverActive : current))
        setActiveExerciseId(null)
        toast(tRef.current('wtResumedFromServer'))
        return
      }
    }

    // Roll back rather than keep a session the server rejected: the crash
    // cache is cleared by the persistence effect, and any set logged in the
    // few hundred ms before the reply is dropped with it (`current.id`
    // check so a session started after a slow failure isn't clobbered).
    if (error && !queued) {
      console.error(error)
      setActiveSession((current) => (current?.id === id ? null : current))
      setActiveExerciseId(null)
      toast.error(tRef.current('wtStartFailed'))
    }
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
      {
        exerciseId: newExercise.id,
        exerciseName: name,
        restTime,
        isTimeBased,
        completedRests: 0,
        sets: [],
      },
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

  // --- Rest tally -------------------------------------------------------
  //
  // Every rest that counts all the way down bumps that exercise's
  // `completedRests` in the session snapshot (rendered as a row of timer
  // icons under the exercise). The timer publishes `lastCompleted` when it
  // auto-dismisses at 00:00; a manual cancel publishes nothing, so an
  // interrupted rest never counts. Keyed on the exercise the timer was
  // started for — not `activeExerciseId` — because the user may have
  // expanded a different card while resting.
  //
  // Runs once per completion (guarded by the ref against StrictMode's
  // double effect run in development) and reads the session through
  // activeSessionRef so the session itself need not be a dependency —
  // otherwise every set logged would re-run the effect.
  const lastHandledRestRef = useRef(null)
  useEffect(() => {
    const completed = timer.lastCompleted
    if (!completed || completed === lastHandledRestRef.current) return
    lastHandledRestRef.current = completed

    // The session may have ended, or the exercise been deleted, while the
    // rest was still counting — nothing to tally then.
    const session = activeSessionRef.current
    if (!session) return
    if (!session.exercises.some((ex) => ex.exerciseId === completed.exerciseId)) return

    const updatedExercises = session.exercises.map((ex) =>
      ex.exerciseId === completed.exerciseId
        ? { ...ex, completedRests: (ex.completedRests ?? 0) + 1 }
        : ex
    )
    setActiveSession({ ...session, exercises: updatedExercises })

    writeMutation({
      table: 'sessions',
      type: 'update',
      payload: { exercises: updatedExercises },
      match: { column: 'id', value: session.id },
    }).then(({ error }) => logSupabaseError(error))
  }, [timer.lastCompleted, writeMutation])

  // Discards the in-progress session without saving anything to history.
  // Silent when nothing was logged (the row is just deleted, like an
  // empty "finish"); asks first when at least one set exists. Setting
  // activeSession to null also clears the crash-recovery cache in
  // localStorage via the persistence effect above.
  function handleCancelWorkout() {
    if (!activeSession) return
    const loggedSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    if (loggedSets > 0 && !window.confirm(tRef.current('wtCancelWorkoutConfirm'))) return
    lastClosedSessionIdRef.current = activeSession.id
    // Anything still queued for this session (an offline insert, set
    // updates) must never replay — it would recreate the row we are about
    // to delete on the next app boot.
    dropQueuedSessionMutations(activeSession.id)

    writeMutation({
      table: 'sessions',
      type: 'delete',
      match: { column: 'id', value: activeSession.id },
    }).then(({ error }) => logSupabaseError(error))

    setActiveSession(null)
    setDrafts({})
    setActiveExerciseId(null)
    setIsAddingExercise(false)
    setEditingExerciseId(null)
    timer.cancelTimer()
    if (loggedSets > 0) toast(tRef.current('wtCancelWorkoutDone'))
  }

  function handleFinishWorkout() {
    const loggedExercises = activeSession.exercises.filter((ex) => ex.sets.length > 0)
    const sessionId = activeSession.id
    lastClosedSessionIdRef.current = sessionId
    // The upsert/delete below carries the session's final state, so every
    // earlier queued write for it is redundant — and a queued *insert* with
    // status 'active' would resurrect the workout on the next boot.
    dropQueuedSessionMutations(sessionId)

    if (loggedExercises.length > 0) {
      setHistory((prev) => [{ ...activeSession, exercises: loggedExercises }, ...prev])
      // Upsert of the whole row, not an update by id: if the original
      // insert was ever lost (offline replay stalled, the 23505 case
      // above), an update would match zero rows and the finished workout
      // would exist only in this device's local history.
      writeMutation({
        table: 'sessions',
        type: 'upsert',
        payload: {
          id: sessionId,
          user_id: user.id,
          routine_id: activeSession.routineId,
          routine_name: activeSession.routineName,
          date: activeSession.date,
          exercises: loggedExercises,
          status: 'completed',
        },
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
    clearQueue()

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
    handleCancelWorkout,
    handleClearAllData,
    handleUpdateHistorySession,
    handleDeleteHistorySession,
  }
}
