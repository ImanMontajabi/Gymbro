import { useEffect, useState } from 'react'

// Toggles the `dark` class on <html> — Tailwind's dark-mode selector reads
// this everywhere else in the app.
export function useDarkMode(initial = true) {
  const [isDark, setIsDark] = useState(initial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return [isDark, setIsDark]
}
