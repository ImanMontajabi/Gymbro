// Synthesizes a short, pleasant double-beep using the native Web Audio API —
// no audio files or network requests, works fully offline.
export function playRestCompleteChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContextClass()

    const playTone = (startTime, frequency) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.32)
    }

    const now = ctx.currentTime
    playTone(now, 880) // A5
    playTone(now + 0.3, 1046.5) // C6 — ascending "ding-ding"

    setTimeout(() => ctx.close(), 800)
  } catch {
    // AudioContext unavailable/blocked — the timer itself still works, just silently.
  }
}
