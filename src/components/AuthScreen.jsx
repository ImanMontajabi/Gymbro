import { useState } from 'react'
import { supabase } from '../supabase'
import ThemeToggle from './ThemeToggle'

// Maps common Supabase auth error messages to Persian. Falls back to the
// raw message for anything not covered here.
function translateAuthError(message) {
  const map = {
    'Invalid login credentials': 'ایمیل یا رمز عبور اشتباه است',
    'User already registered': 'این ایمیل قبلاً ثبت‌نام کرده است',
    'Password should be at least 6 characters': 'رمز عبور باید حداقل ۶ کاراکتر باشد',
    'Unable to validate email address: invalid format': 'فرمت ایمیل نامعتبر است',
    'Email not confirmed': 'ایمیل شما هنوز تایید نشده است',
  }
  return map[message] || message
}

// Classic email/password sign-in + sign-up screen, shown whenever there's no
// authenticated Supabase session.
export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const { error: authError } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (authError) {
      setError(translateAuthError(authError.message))
      return
    }
    // On success, App.jsx's onAuthStateChange listener picks up the new
    // session automatically — nothing else to do here.
  }

  function switchMode(nextMode) {
    if (nextMode === mode) return
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-md shadow-black/5 dark:border-white/10 dark:bg-gray-900 dark:shadow-black/20">
        <h1 className="mb-1 text-center text-2xl font-bold">جیم برو</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'login' ? 'وارد حساب کاربری خود شوید' : 'ایجاد حساب کاربری جدید'}
        </p>

        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-[0.97] ${
              mode === 'login'
                ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-[0.97] ${
              mode === 'signup'
                ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-700 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        <form
          key={mode}
          onSubmit={handleSubmit}
          className="animate-fade-slide-in flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 transition-all duration-150 ease-out focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 transition-all duration-150 ease-out focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-purple-600 py-4 text-lg font-bold text-white shadow-md shadow-purple-600/20 transition-all duration-150 ease-out active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? '...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>
      </div>
    </div>
  )
}
