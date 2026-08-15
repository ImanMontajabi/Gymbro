import { useEffect, useMemo, useState } from 'react'
import { usePersistedState } from './hooks/usePersistedState'
import { findPreviousExercise, formatSessionDate } from './utils/history'
import { playRestCompleteChime } from './utils/audio'
import { sanitizeNumericInput } from './utils/numbers'

// ---------------------------------------------------------------------------
// Starting routines — only used the very first time the app runs (before
// anything is saved to LocalStorage). After that, routines/exercises are
// fully editable in the UI via the add/edit/delete icon buttons.
// restTime is in seconds and drives the auto rest timer after "ثبت ست".
// ---------------------------------------------------------------------------
const DEFAULT_ROUTINES = [
  {
    id: crypto.randomUUID(),
    name: 'Upper A',
    exercises: [
      { name: 'پرس سینه هالتر', restTime: 150 },
      { name: 'زیربغل هالتر خم', restTime: 120 },
      { name: 'پرس سرشانه دمبل', restTime: 90 },
    ].map(({ name, restTime }) => ({ id: crypto.randomUUID(), name, restTime })),
  },
  {
    id: crypto.randomUUID(),
    name: 'Lower A',
    exercises: [
      { name: 'اسکات هالتر', restTime: 180 },
      { name: 'لانگز دمبل', restTime: 90 },
      { name: 'ساق پا ایستاده', restTime: 60 },
    ].map(({ name, restTime }) => ({ id: crypto.randomUUID(), name, restTime })),
  },
  {
    id: crypto.randomUUID(),
    name: 'Upper B',
    exercises: [
      { name: 'پرس سینه دمبل', restTime: 120 },
      { name: 'زیربغل قایقی سیم‌کش', restTime: 90 },
      { name: 'نشر جانب دمبل', restTime: 60 },
    ].map(({ name, restTime }) => ({ id: crypto.randomUUID(), name, restTime })),
  },
  {
    id: crypto.randomUUID(),
    name: 'Lower B',
    exercises: [
      { name: 'ددلیفت رومانیایی', restTime: 150 },
      { name: 'پرس پا دستگاه', restTime: 120 },
      { name: 'پشت پا خوابیده دستگاه', restTime: 60 },
    ].map(({ name, restTime }) => ({ id: crypto.randomUUID(), name, restTime })),
  },
]
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  routines: 'gymbro_routines',
  history: 'gymbro_history',
  activeSession: 'gymbro_active_session',
}

const EMPTY_DRAFT = { weight: '', reps: '', note: '' }

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
function NameEditRow({ initialValue, placeholder, onSave, onCancel }) {
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
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
        }}
        className="min-w-0 flex-1 rounded-lg border border-purple-400 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={save}
        aria-label="ذخیره"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-green-600 transition-colors hover:bg-gray-100 dark:text-green-400 dark:hover:bg-gray-800"
      >
        <Icon name="check" className="text-[20px]" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="لغو"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
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

function App() {
  const [isDark, setIsDark] = useState(true)
  const [routines, setRoutines] = usePersistedState(STORAGE_KEYS.routines, DEFAULT_ROUTINES)
  const [history, setHistory] = usePersistedState(STORAGE_KEYS.history, [])
  const [activeSession, setActiveSession] = usePersistedState(STORAGE_KEYS.activeSession, null)
  const [drafts, setDrafts] = useState({}) // { [exerciseId]: { weight, reps, note } }

  const [editingRoutineId, setEditingRoutineId] = useState(null)
  const [isAddingRoutine, setIsAddingRoutine] = useState(false)
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [isAddingExercise, setIsAddingExercise] = useState(false)

  // Rest timer — a single active timer at a time, tied to whichever exercise
  // it belongs to. Logging any set overwrites it (per spec: "restarting a
  // new set should reset and overwrite the timer").
  const [activeTimer, setActiveTimer] = useState(null) // { exerciseId, duration, endTime }
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    if (!activeTimer) return
    let intervalId

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000))
      setRemaining(secondsLeft)
      if (secondsLeft <= 0) {
        clearInterval(intervalId)
        playRestCompleteChime()
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

  // --- Routine CRUD (home screen) ------------------------------------------

  function handleCreateRoutine(name) {
    setRoutines((prev) => [...prev, { id: crypto.randomUUID(), name, exercises: [] }])
    setIsAddingRoutine(false)
  }

  function handleRenameRoutine(routineId, name) {
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, name } : r)))
    setEditingRoutineId(null)
  }

  function handleDeleteRoutine(routineId, routineName) {
    if (!window.confirm(`برنامه «${routineName}» حذف شود؟`)) return
    setRoutines((prev) => prev.filter((r) => r.id !== routineId))
  }

  function handleStartRoutine(routine) {
    setDrafts({})
    setActiveTimer(null)
    setActiveSession({
      id: crypto.randomUUID(),
      routineId: routine.id,
      routineName: routine.name,
      date: Date.now(),
      exercises: routine.exercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        restTime: ex.restTime || 0,
        sets: [],
      })),
    })
  }

  // --- Exercise CRUD (inside workout view) ---------------------------------

  function handleAddExercise({ name, restTime }) {
    const newExercise = { id: crypto.randomUUID(), name, restTime }

    setRoutines((prev) =>
      prev.map((r) =>
        r.id === activeSession.routineId ? { ...r, exercises: [...r.exercises, newExercise] } : r
      )
    )
    setActiveSession((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        { exerciseId: newExercise.id, exerciseName: name, restTime, sets: [] },
      ],
    }))
    setIsAddingExercise(false)
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
    setActiveSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, exerciseName: name, restTime } : ex
      ),
    }))
    setEditingExerciseId(null)
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
    setActiveSession((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.exerciseId !== exerciseId),
    }))
    if (activeTimer?.exerciseId === exerciseId) setActiveTimer(null)
  }

  // --- Set logging -----------------------------------------------------------

  function handleAddSet(exerciseId, e) {
    e.preventDefault()
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

    setActiveSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, sets: [...ex.sets, newSet] } : ex
      ),
    }))

    setDrafts((prev) => ({ ...prev, [exerciseId]: EMPTY_DRAFT }))

    const restTime = Number(exercise?.restTime) || 0
    if (restTime > 0) {
      setActiveTimer({ exerciseId, duration: restTime, endTime: Date.now() + restTime * 1000 })
    }
  }

  function handleDeleteSet(exerciseId, setId) {
    setActiveSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
      ),
    }))
  }

  function handleFinishWorkout() {
    const loggedExercises = activeSession.exercises.filter((ex) => ex.sets.length > 0)
    if (loggedExercises.length > 0) {
      setHistory((prev) => [...prev, { ...activeSession, exercises: loggedExercises }])
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

    localStorage.clear()
    // Re-seed explicitly: if `routines` is already the DEFAULT_ROUTINES
    // reference (e.g. a never-edited fresh install), setRoutines below is a
    // no-op for React, so the usePersistedState effect wouldn't otherwise
    // re-run to restore what localStorage.clear() just wiped.
    localStorage.setItem(STORAGE_KEYS.routines, JSON.stringify(DEFAULT_ROUTINES))
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([]))

    setRoutines(DEFAULT_ROUTINES)
    setHistory([])
    setActiveSession(null)
    setDrafts({})
    setActiveTimer(null)
    setEditingRoutineId(null)
    setIsAddingRoutine(false)
    setEditingExerciseId(null)
    setIsAddingExercise(false)
    setIsDark(true)
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

  const clearDataButton = (
    <button
      type="button"
      onClick={handleClearAllData}
      aria-label="پاک کردن اطلاعات"
      title="پاک کردن اطلاعات"
      className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-800"
    >
      <Icon name="cleaning_services" className="text-[20px]" />
    </button>
  )

  // --- Home screen ------------------------------------------------------------

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">جیم برو</h1>
            <div className="flex items-center gap-2">
              {clearDataButton}
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 dark:text-gray-400">برنامه</span>
            <h1 className="text-2xl font-bold">{activeSession.routineName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {clearDataButton}
            {darkToggleButton}
          </div>
        </header>

        <div className="flex flex-col gap-4">
          {activeSession.exercises.map((ex, index) => {
            const draft = getDraft(ex.exerciseId)
            const previous = previousRecords[ex.exerciseName]
            const canSubmit = Number(draft.weight) > 0 && Number(draft.reps) > 0

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
                    disabled={!canSubmit}
                    className="rounded-xl bg-purple-600 py-4 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                  >
                    ثبت ست
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
