import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

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
// The timer does not auto-clear at zero — it keeps counting into negative
// "overtime" so a user who was mid-set when it hit zero, or whose phone
// was locked past it, sees exactly how far over they are, rather than the
// timer just vanishing.
export function useRestTimer() {
  const [activeTimer, setActiveTimer] = useState(null) // { exerciseId, duration, targetTime }
  const [remaining, setRemaining] = useState(0) // seconds; <= 0 once expired
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (!activeTimer) return

    function sync() {
      const secondsLeft = Math.ceil((activeTimer.targetTime - Date.now()) / 1000)
      setRemaining(secondsLeft)
      if (secondsLeft <= 0 && !notifiedRef.current) {
        notifiedRef.current = true
        toast('زمان استراحت تمام شد', {
          icon: <img src="/timer.png" alt="" className="h-5 w-5 object-contain" />,
        })
      }
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
    notifiedRef.current = false
    setActiveTimer({ exerciseId, duration, targetTime: Date.now() + duration * 1000 })
  }

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
    isOverdue: !!activeTimer && remaining <= 0,
    startTimer,
    cancelTimer,
    cancelIfMatches,
  }
}
