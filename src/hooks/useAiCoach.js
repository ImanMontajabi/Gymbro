import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { generateWorkoutReport } from '../utils/aiReport'
import { useLanguage } from '../context/LanguageContext'

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

const LANG_MAP = { fa: 'Persian', en: 'English', ar: 'Arabic' }

// A language directive alone gets Gemini to translate literally — e.g. it
// rendered "داداش" as "dadash" in Arabic output, since that's just how a
// direct translation of Persian gym-bro slang comes out. Each language
// needs its *own* native slang/persona instead of a translation of
// Persian's, so this is a per-language tone rather than a single
// generic "friendly tone" instruction.
const TONE_MAP = {
  fa: "Use a friendly, Iranian gym-bro tone. Use words like 'داداش' or 'رفیق'.",
  en: "Use a friendly, supportive gym-bro tone. Use words like 'bro' or 'mate'.",
  ar: "Use a friendly, encouraging Arabic sports tone. Address the user as 'يا بطل' (champion) or 'يا كابتن' (captain). NEVER use Persian slang like 'dadash'.",
}

// "Sandwich technique": the workout report's own Persian tokens (exercise
// names, notes) bias Gemini toward replying in Persian even when a single
// trailing instruction asks for another language — the report body simply
// outweighs one short line. Wrapping it with the *same* directive at both
// the very start (primacy) and the very end (recency) of the prompt is
// what actually overrides that bias.
function buildLanguageDirectiveTop(language) {
  const targetLanguage = LANG_MAP[language] ?? LANG_MAP.fa
  return `[SYSTEM DIRECTIVE: The user's workout data may be in Persian, but you MUST process it and generate your ENTIRE response strictly in ${targetLanguage}.]`
}

// Tone is bundled into the same trailing block as the language override —
// both need to be the last thing Gemini reads before it generates, since
// the tone instruction is what stops it from literally translating
// Persian slang instead of using the target language's own idiom.
function buildLanguageDirectiveBottom(language) {
  const targetLanguage = LANG_MAP[language] ?? LANG_MAP.fa
  const tone = TONE_MAP[language] ?? TONE_MAP.fa
  return `CRITICAL OVERRIDE: Generate your final output ONLY in ${targetLanguage}. Do not output Persian unless it is an untranslatable proper noun.\n${tone}`
}

// Owns the "AI Coach" tab's request lifecycle: builds the compact report
// from routines/history, calls the ai-coach Edge Function, and tracks
// loading/result/error state for the UI.
export function useAiCoach() {
  const { language } = useLanguage()
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // `goalInstruction`, when given, is a short instructional line placed
  // right before the report data — see AI_GOAL_INSTRUCTIONS in
  // i18n/translations.js — steering the analysis toward that goal. The
  // language directives sandwich the whole thing (goal + report) rather
  // than just the report, so a goal instruction can never end up as the
  // last thing Gemini reads before generating.
  const requestAnalysis = useCallback(
    async (routines, history, goalInstruction) => {
      if (!navigator.onLine) {
        toast.error('برای دریافت تحلیل عملکرد به اینترنت متصل شوید')
        return
      }

      setIsLoading(true)
      try {
        const workoutReport = generateWorkoutReport(routines, history)
        const body = [goalInstruction, workoutReport].filter(Boolean).join('\n\n')
        const report = `${buildLanguageDirectiveTop(language)}\n\n${body}\n\n${buildLanguageDirectiveBottom(language)}`
        const result = await fetchWorkoutAnalysis(report)
        setAnalysis(result)
      } catch (error) {
        console.error(error)
        toast.error('دریافت تحلیل عملکرد ناموفق بود. دوباره تلاش کنید.')
      } finally {
        setIsLoading(false)
      }
    },
    [language]
  )

  return { analysis, isLoading, requestAnalysis }
}
