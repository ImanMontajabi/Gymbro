import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

// Rest timer — a single active timer at a time, tied to whichever exercise
// it belongs to. Logging any set overwrites it (per spec: "restarting a
// new set should reset and overwrite the timer"). Deliberately silent — no
// audio alarm — since a beep is distracting in a gym; a toast is the only
// cue when the countdown reaches zero.
export function useRestTimer() {
  const [activeTimer, setActiveTimer] = useState(null) // { exerciseId, duration, endTime }
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!activeTimer) return
    let intervalId

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000))
      setRemaining(secondsLeft)
      if (secondsLeft <= 0) {
        clearInterval(intervalId)
        toast('زمان استراحت تمام شد', { icon: '⏱️' })
        setActiveTimer(null)
      }
    }

    tick()
    intervalId = setInterval(tick, 250)
    return () => clearInterval(intervalId)
  }, [activeTimer])

  function startTimer(exerciseId, duration) {
    setActiveTimer({ exerciseId, duration, endTime: Date.now() + duration * 1000 })
  }

  function cancelTimer() {
    setActiveTimer(null)
  }

  // Only clears the timer if it belongs to this exercise — used when an
  // exercise is deleted mid-rest, so unrelated timers aren't touched.
  function cancelIfMatches(exerciseId) {
    setActiveTimer((prev) => (prev?.exerciseId === exerciseId ? null : prev))
  }

  return { activeTimer, remaining, startTimer, cancelTimer, cancelIfMatches }
}
