import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Icon from './Icon'
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

// Requires a domain of at least 2 characters and restricts the TLD to a
// whitelist of common, trusted extensions — Supabase's own check accepts
// things like `test-iman@m.xc` now that email confirmation is disabled,
// since it never actually has to deliver mail there. This is a practical
// spam/fake-account filter, not full RFC 5322 validation.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]{2,}\.(com|org|net|ir|de|io|co|app|me|info)$/i

// Classic email/password sign-in + sign-up screen, shown whenever there's no
// authenticated Supabase session.
export default function AuthScreen() {
  const navigate = useNavigate()
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

    if (!EMAIL_REGEX.test(email)) {
      setError('فرمت ایمیل نامعتبر است (مثال: user@gmail.com)')
      return
    }

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
    <div className="relative flex min-h-screen items-center justify-center bg-[rgb(var(--ctp-base))] px-4 text-[rgb(var(--ctp-text))]">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-6 shadow-md shadow-black/10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-70"
        >
          <Icon name="arrow_forward" className="text-[18px]" />
          بازگشت
        </button>
        <h1 className="mb-1 text-center text-2xl font-bold">جیم برو</h1>
        <p className="mb-6 text-center text-sm text-[rgb(var(--ctp-subtext0))]">
          {mode === 'login' ? 'وارد حساب کاربری خود شوید' : 'ایجاد حساب کاربری جدید'}
        </p>

        <div className="mb-6 flex gap-1 rounded-xl bg-[rgb(var(--ctp-mantle))] p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-[0.97] ${
              mode === 'login'
                ? 'bg-[rgb(var(--ctp-surface1))] text-[rgb(var(--ctp-mauve))] shadow-sm'
                : 'text-[rgb(var(--ctp-subtext0))]'
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-[0.97] ${
              mode === 'signup'
                ? 'bg-[rgb(var(--ctp-surface1))] text-[rgb(var(--ctp-mauve))] shadow-sm'
                : 'text-[rgb(var(--ctp-subtext0))]'
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
            <label htmlFor="email" className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]">
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
              className="rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-3.5 text-base text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]"
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
              className="rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-3.5 text-base text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
            />
          </div>

          {error && <p className="text-sm text-[rgb(var(--ctp-red))]">{error}</p>}
          {notice && <p className="text-sm text-[rgb(var(--ctp-green))]">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-[rgb(var(--ctp-mauve))] py-4 text-lg font-bold text-[rgb(var(--ctp-base))] shadow-md shadow-black/20 transition-all duration-150 ease-out active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? '...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>
      </div>
    </div>
  )
}
