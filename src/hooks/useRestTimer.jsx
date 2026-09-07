import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'

// Rest timer — a single active timer at a time, tied to whichever exercise
// it belongs to. Logging any set overwrites it (per spec: "restarting a
// new set should reset and overwrite the timer"). Deliberately silent — no
// audio alarm — since a beep is distracting in a gym; a toast is the only
// cue when the countdown reaches zero.
//
// iOS freezes JS execution entirely while the screen is locked, so a
// setInterval that just decrements a counter drifts or stalls outright —
// a phone locked for 90s during a 60s rest can come back having "ticked"
// only a couple of times. The fix: `targetTime` (an absolute
// Date.now()-based timestamp) is the only source of truth, and `remaining`
// is always recomputed as `targetTime - Date.now()` — on every interval
// tick AND, critically, the instant the tab becomes visible again
// (`visibilitychange`), so unlocking the phone immediately shows the
// correct state instead of waiting for the next tick.
//
// Reaching zero auto-dismisses the timer (no manual cancel needed) and
// publishes a `lastCompleted` event. useWorkoutData listens to that event
// and bumps the exercise's `completedRests` tally — the timer itself knows
// nothing about sessions, which keeps it reusable and keeps the session
// snapshot the single place that owns per-exercise data.
export function useRestTimer() {
  const { t } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t

  const [activeTimer, setActiveTimer] = useState(null) // { exerciseId, duration, targetTime }
  const [remaining, setRemaining] = useState(0) // seconds
  // { exerciseId, at } for the most recent rest that ran all the way down.
  // `at` makes every completion a fresh object, so two back-to-back rests
  // for the same exercise both trigger the listener's effect.
  const [lastCompleted, setLastCompleted] = useState(null)

  useEffect(() => {
    if (!activeTimer) return

    function sync() {
      const secondsLeft = Math.ceil((activeTimer.targetTime - Date.now()) / 1000)
      if (secondsLeft > 0) {
        setRemaining(secondsLeft)
        return
      }
      // Done: dismiss, notify, and record the completion exactly once. The
      // effect cleanup below tears down the interval as soon as
      // activeTimer becomes null, so this branch can't re-fire.
      setActiveTimer(null)
      setRemaining(0)
      setLastCompleted({ exerciseId: activeTimer.exerciseId, at: Date.now() })
      toast(tRef.current('wtRestFinished'), {
        icon: <img src="/timer.png" alt="" className="h-5 w-5 object-contain" />,
      })
    }

    sync()
    const intervalId = setInterval(sync, 250)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeTimer])

  function startTimer(exerciseId, duration) {
    setActiveTimer({ exerciseId, duration, targetTime: Date.now() + duration * 1000 })
  }

  // Manual cancel (or session end): the rest did not run its course, so
  // no completion event is published and no tally is added.
  function cancelTimer() {
    setActiveTimer(null)
    setRemaining(0)
  }

  // Only clears the timer if it belongs to this exercise — used when an
  // exercise is deleted mid-rest, so unrelated timers aren't touched.
  function cancelIfMatches(exerciseId) {
    setActiveTimer((prev) => {
      if (prev?.exerciseId !== exerciseId) return prev
      setRemaining(0)
      return null
    })
  }

  return {
    activeTimer,
    remaining,
    lastCompleted,
    startTimer,
    cancelTimer,
    cancelIfMatches,
  }
}
