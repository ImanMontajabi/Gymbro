import { useEffect, useState } from 'react'
import Icon from './Icon'

// Marketing/landing page shown on the custom domain's root, before the user
// enters the actual app (AuthScreen). `onEnterApp` is called by both CTAs
// once the user is ready to proceed — install is a bonus, not a gate.
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-blue-700 text-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-blue-700/70 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <Icon name="pets" className="text-[20px] text-white" />
          </span>
          <span className="text-lg font-bold">جیم برو</span>
        </div>
        <button
          type="button"
          onClick={onEnterApp}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold transition-all duration-150 ease-out active:scale-95 active:opacity-70"
        >
          ورود به اپلیکیشن
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pt-14 text-center">
        <h1 className="text-5xl leading-[1.15] font-extrabold text-balance">رفیقِ تمرینیِ تو</h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-blue-100">
          پیشرفتت رو ست به ست ثبت کن، رکوردهاتو ببین و هیچ‌وقت تمرین امروزت رو گم نکن
        </p>

        <div className="mt-8 flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-green-500 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-green-900/20 transition-all duration-150 ease-out active:scale-95 active:opacity-80"
          >
            <Icon name="download" className="text-[18px]" />
            نصب اپلیکیشن
          </button>
          <button
            type="button"
            onClick={onEnterApp}
            className="flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition-all duration-150 ease-out active:scale-95 active:opacity-70"
          >
            نسخه وب
          </button>
        </div>
      </main>

      <div className="relative z-10 mt-10 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <img
          src="/cat-hero.png"
          alt="ماسکوت گربه ورزشکار جیم برو"
          className="animate-float-breathe h-64 w-64 object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.25)] sm:h-80 sm:w-80"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
        {/* Shown only if /cat-hero.png hasn't been added to /public yet. */}
        <div className="animate-float-breathe hidden h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
          <Icon name="pets" className="text-[160px] text-white/90" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent" />

      {showIosToast && (
        <div className="animate-fade-slide-in fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-sm rounded-2xl border border-white/15 bg-gray-900/90 px-4 py-3.5 text-center text-sm font-medium text-white shadow-lg shadow-black/30 backdrop-blur-md">
          در سافاری دکمه Share را بزنید و Add to Home Screen را انتخاب کنید
        </div>
      )}
    </div>
  )
}
