import { useEffect, useState } from 'react'
import Icon from './Icon'
import ThemeToggle from './ThemeToggle'

// Marketing/landing page shown on the custom domain's root, before the user
// enters the actual app (AuthScreen). `onEnterApp` is called by both CTAs
// once the user is ready to proceed — install is a bonus, not a gate.
//
// Colors come from Catppuccin (https://catppuccin.com/palette) via the
// --ctp-* CSS variables defined in index.css, driven by the global
// [data-ctp-theme] attribute ThemeProvider sets on <html> (see
// context/ThemeContext.jsx) — the palette button in the header is
// <ThemeToggle />, shared with AuthScreen and the main app.
export default function LandingPage({ onEnterApp }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showIosToast, setShowIosToast] = useState(false)

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    if (!showIosToast) return
    const timer = setTimeout(() => setShowIosToast(false), 4000)
    return () => clearTimeout(timer)
  }, [showIosToast])

  async function handleInstallClick() {
    if (!installPrompt) {
      setShowIosToast(true)
      return
    }
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[rgb(var(--ctp-base))] text-[rgb(var(--ctp-text))] transition-colors duration-300">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-base)/0.7)] px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img
            src="/pwa-192x192.png"
            alt="Gymbro Logo"
            className="h-8 w-8 rounded-xl object-contain shadow-sm"
          />
          <span className="text-lg font-bold">جیم برو</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onEnterApp}
            className="rounded-full border border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-surface0)/0.5)] px-4 py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-95 active:opacity-70"
          >
            ورود به اپلیکیشن
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-14 text-center">
        <h1 className="text-5xl leading-[1.15] font-extrabold text-balance">رفیقِ تمرینیِ تو</h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-[rgb(var(--ctp-subtext0))]">
          پیشرفتت رو ست به ست ثبت کن، رکوردهاتو ببین و هیچ‌وقت تمرین امروزت رو گم نکن
        </p>

        <div className="mt-8 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--ctp-green))] px-5 py-3.5 text-sm font-bold text-[rgb(var(--ctp-base))] shadow-md shadow-black/20 transition-all duration-150 ease-out active:scale-95 active:opacity-80"
          >
            <Icon name="download" className="text-[18px]" />
            نصب اپلیکیشن
          </button>
          <button
            type="button"
            onClick={onEnterApp}
            className="flex-1 rounded-full border border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-surface0)/0.35)] px-5 py-3.5 text-sm font-bold transition-all duration-150 ease-out active:scale-95 active:opacity-70"
          >
            نسخه وب
          </button>
        </div>
      </main>

      <div className="relative z-10 mt-2 flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <img
          src="/cat-hero.png"
          alt="ماسکوت گربه ورزشکار جیم برو"
          className="animate-float-breathe h-72 w-72 -translate-y-6 object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.25)] sm:h-96 sm:w-96 sm:-translate-y-10"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
        {/* Shown only if /cat-hero.png hasn't been added to /public yet. */}
        <div className="animate-float-breathe hidden h-72 w-72 -translate-y-6 items-center justify-center sm:h-96 sm:w-96 sm:-translate-y-10">
          <Icon name="pets" className="text-[160px] text-[rgb(var(--ctp-text)/0.9)]" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent" />

      {showIosToast && (
        <div className="animate-fade-slide-in fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm rounded-2xl border border-[rgb(var(--ctp-surface0))] bg-[rgb(var(--ctp-base)/0.9)] px-4 py-3.5 text-center text-sm font-medium text-[rgb(var(--ctp-text))] shadow-lg shadow-black/30 backdrop-blur-md">
          در سافاری دکمه Share را بزنید و Add to Home Screen را انتخاب کنید
        </div>
      )}
    </div>
  )
}
