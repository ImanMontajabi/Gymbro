import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_MODEL = 'gemini-3.6-flash'

const SYSTEM_PROMPT = `تو یک مربی بدنسازی مهربان، پرانرژی و حمایت‌گر هستی. دیتای ۳۰ روز گذشته‌ی
تمرینی کاربر را تحلیل کن. اول از همه بابت تلاش‌هایش به او تبریک بگو و نقاط
قوتش را برجسته کن. سپس یک پیشنهاد دوستانه، ملایم و عملی برای بهبود جلسه‌ی
امروزش بده. لحن تو باید صمیمی، محاوره‌ای و پر از انرژی مثبت باشد. پاسخ را
کوتاه و با فرمت Markdown بده.

نکته مهم: اول تعداد جلسات ثبت‌شده در گزارش را چک کن. اگر فقط ۱ یا ۲ جلسه
تمرینی وجود دارد، لحن خودت را واقع‌بینانه و آرام نگه دار و از تعریف و تمجید
اغراق‌آمیز یا انگیزشیِ ساختگی خودداری کن؛ فقط بگو شروع خوبی بوده و کاربر را
به ادامه دادن تشویق کن.`

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight — the browser sends this before the real POST because of the
  // custom Authorization/apikey headers supabase-js attaches.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let report
  try {
    ;({ report } = await req.json())
  } catch {
    return jsonResponse({ error: 'بدنه درخواست نامعتبر است' }, 400)
  }

  if (!report || typeof report !== 'string') {
    return jsonResponse({ error: 'فیلد report الزامی است' }, 400)
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY secret is not set')
    return jsonResponse({ error: 'پیکربندی سرور ناقص است' }, 500)
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          // Header form keeps the key out of the URL (query-param logs, proxies).
          'x-goog-api-key': geminiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    "تو یک مربی حرفه‌ای بدنسازی و یک رفیق صمیمی هستی. حتماً کاربر را در متن 'داداش' " +
                    'صدا بزن. داده‌های تمرینی زیر را تحلیل کن.\n' +
                    'روند خروجی تو:\n' +
                    'ابتدا یک تشویق کوتاه و یک پیشنهاد کلی برای امروز بده.\n' +
                    'سپس، به جای بررسی همه حرکات، فقط و فقط ۳ حرکت (مهم‌ترین‌ها: یا پیشرفت عالی ' +
                    'داشته‌اند یا نیاز به اصلاح فرم و وزنه دارند) را گلچین کن و نام آن‌ها را بولد کن و ' +
                    'برای هر کدام یک خط فیدبک دقیق و عملی بنویس. به هیچ وجه بقیه حرکات را لیست نکن. ' +
                    'خروجی باید کوتاه، مفید و حتماً تا نقطه پایان کامل باشد.\n\n' +
                    'گزارش تمرین:\n' +
                    report,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, errText)
      return jsonResponse(
        { error: 'خطا در ارتباط با هوش مصنوعی', details: errText },
        502
      )
    }

    const data = await geminiRes.json()
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason && finishReason !== 'STOP') {
      // e.g. "MAX_TOKENS" — confirms in the logs whether a future truncation
      // report is a token-budget issue rather than a prompt/formatting one.
      console.error('Gemini finishReason:', finishReason)
    }
    const analysis = data.candidates[0].content.parts.map((p) => p.text).join('').trim()

    if (!analysis) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data))
      return jsonResponse(
        { error: 'پاسخ نامعتبر از هوش مصنوعی', details: JSON.stringify(data) },
        502
      )
    }

    return jsonResponse({ analysis })
  } catch (error) {
    console.error('ai-coach function error:', error)
    return jsonResponse(
      {
        error: 'خطای غیرمنتظره رخ داد',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
