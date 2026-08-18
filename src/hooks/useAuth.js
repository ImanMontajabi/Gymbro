import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Tracks the Supabase auth session. `authSession` is intentionally exposed
// (not just the derived `user`) because it has three distinct states the
// app gates rendering on: `undefined` (still checking), `null` (confirmed
// logged out), or a session object (logged in) — collapsing straight to
// `user` would make "still checking" indistinguishable from "logged out".
export function useAuth() {
  const [authSession, setAuthSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuthSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  return {
    authSession,
    user: authSession?.user ?? null,
    logout: () => supabase.auth.signOut(),
  }
}
