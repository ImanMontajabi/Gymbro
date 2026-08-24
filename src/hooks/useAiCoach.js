import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { generateWorkoutReport } from '../utils/aiReport'

// Calls the `ai-coach` Supabase Edge Function, which forwards the report to
// Gemini server-side (keeping the API key off the client) and returns
// `{ analysis }`. supabase-js attaches the user's auth token automatically,
// so this only succeeds for a signed-in user — matching the function's
// default JWT verification.
async function fetchWorkoutAnalysis(report) {
  const { data, error } = await supabase.functions.invoke('ai-coach', {
    body: { report },
  })

  if (error) throw error
  if (!data?.analysis) throw new Error('پاسخ نامعتبر از سرور')

  return data.analysis
}

// Owns the "AI Coach" tab's request lifecycle: builds the compact report
// from routines/history, calls the ai-coach Edge Function, and tracks
// loading/result/error state for the UI.
export function useAiCoach() {
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // `goalInstruction`, when given, is a short instructional line prepended
  // to the report text — see AI_GOAL_INSTRUCTIONS in i18n/translations.js —
  // so it lands ahead of the "گزارش تمرین:" data in the prompt the
  // ai-coach Edge Function sends to Gemini (see
  // supabase/functions/ai-coach/index.ts), steering the analysis toward
  // that goal without changing the function itself.
  const requestAnalysis = useCallback(async (routines, history, goalInstruction) => {
    if (!navigator.onLine) {
      toast.error('برای دریافت تحلیل عملکرد به اینترنت متصل شوید')
      return
    }

    setIsLoading(true)
    try {
      const workoutReport = generateWorkoutReport(routines, history)
      const report = goalInstruction ? `${goalInstruction}\n\n${workoutReport}` : workoutReport
      const result = await fetchWorkoutAnalysis(report)
      setAnalysis(result)
    } catch (error) {
      console.error(error)
      toast.error('دریافت تحلیل عملکرد ناموفق بود. دوباره تلاش کنید.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { analysis, isLoading, requestAnalysis }
}
