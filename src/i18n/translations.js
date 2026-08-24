export const LANGUAGES = ['fa', 'en', 'ar']

// RTL vs LTR per language — drives the `dir` attribute LanguageContext sets
// on <html>. Arabic reads right-to-left same as Persian; only English flips
// the page.
export const LANGUAGE_DIR = { fa: 'rtl', en: 'ltr', ar: 'rtl' }

// Short label shown on the toggle button itself for the language a tap
// switches *to* isn't used — the toggle instead shows the *current*
// language's own short code, in that language's own script, so it reads
// correctly no matter which one is active.
export const LANGUAGE_LABEL = { fa: 'فا', en: 'EN', ar: 'AR' }

// Flat key → per-language string dictionary. Deliberately not translating
// WorkoutTab.jsx (see the PR description) — its strings simply aren't keys
// here, so it stays Persian-only regardless of the active language.
export const translations = {
  common: {
    fa: 'جیم برو',
    en: 'GymBro',
    ar: 'جيم برو',
  },
  save: { fa: 'ذخیره', en: 'Save', ar: 'حفظ' },
  cancel: { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء' },
  close: { fa: 'بستن', en: 'Close', ar: 'إغلاق' },

  // --- Landing page ---------------------------------------------------------
  landingEnterApp: { fa: 'ورود به اپلیکیشن', en: 'Enter App', ar: 'الدخول إلى التطبيق' },
  landingHeadline: { fa: 'رفیقِ تمرینیِ تو', en: 'Your Training Buddy', ar: 'رفيق تمرينك' },
  landingSubtitle: {
    fa: 'پیشرفتت رو ست به ست ثبت کن، رکوردهاتو ببین و هیچ‌وقت تمرین امروزت رو گم نکن',
    en: 'Log your progress set by set, track your records, and never lose today’s workout again',
    ar: 'سجّل تقدمك مجموعة تلو الأخرى، تابع أرقامك القياسية، ولا تفوّت تمرين اليوم أبداً',
  },
  landingInstallApp: { fa: 'نصب اپلیکیشن', en: 'Install App', ar: 'تثبيت التطبيق' },
  landingWebVersion: { fa: 'نسخه وب', en: 'Web Version', ar: 'النسخة الإلكترونية' },
  landingIosInstallHint: {
    fa: 'در سافاری دکمه Share را بزنید و Add to Home Screen را انتخاب کنید',
    en: 'In Safari, tap Share and choose Add to Home Screen',
    ar: 'في سفاري اضغط على زر المشاركة ثم اختر Add to Home Screen',
  },

  // --- Auth screen -----------------------------------------------------------
  authBack: { fa: 'بازگشت', en: 'Back', ar: 'رجوع' },
  authLoginTitle: { fa: 'وارد حساب کاربری خود شوید', en: 'Sign in to your account', ar: 'سجّل الدخول إلى حسابك' },
  authSignupTitle: { fa: 'ایجاد حساب کاربری جدید', en: 'Create a new account', ar: 'إنشاء حساب جديد' },
  authLogin: { fa: 'ورود', en: 'Log in', ar: 'تسجيل الدخول' },
  authSignup: { fa: 'ثبت‌نام', en: 'Sign up', ar: 'إنشاء حساب' },
  authEmail: { fa: 'ایمیل', en: 'Email', ar: 'البريد الإلكتروني' },
  authPassword: { fa: 'رمز عبور', en: 'Password', ar: 'كلمة المرور' },
  authEmailInvalid: {
    fa: 'فرمت ایمیل نامعتبر است (مثال: user@gmail.com)',
    en: 'Invalid email format (e.g. user@gmail.com)',
    ar: 'صيغة البريد الإلكتروني غير صحيحة (مثال: user@gmail.com)',
  },

  // --- Settings modal ---------------------------------------------------------
  settingsTitle: { fa: 'تنظیمات', en: 'Settings', ar: 'الإعدادات' },
  settingsLanguage: { fa: 'زبان', en: 'Language', ar: 'اللغة' },
  settingsClearData: { fa: 'پاک کردن تمام اطلاعات', en: 'Clear All Data', ar: 'حذف جميع البيانات' },
  settingsLogout: { fa: 'خروج', en: 'Log Out', ar: 'تسجيل الخروج' },

  // --- Header / nav ------------------------------------------------------------
  headerOffline: { fa: 'حالت آفلاین', en: 'Offline', ar: 'غير متصل' },
  headerSettings: { fa: 'تنظیمات', en: 'Settings', ar: 'الإعدادات' },
  navWorkout: { fa: 'تمرین امروز', en: "Today's Workout", ar: 'تمرين اليوم' },
  navHistory: { fa: 'تاریخچه و پیشرفت', en: 'History & Progress', ar: 'السجل والتقدم' },
  navCoach: { fa: 'مربی من', en: 'My Coach', ar: 'مدربي' },

  // --- Resume workout banner ---------------------------------------------------
  resumeInProgress: { fa: 'تمرین در جریان', en: 'Workout in progress', ar: 'التمرين جارٍ' },
  resumeContinue: { fa: 'ادامه تمرین', en: 'Continue', ar: 'متابعة' },

  // --- History tab -----------------------------------------------------------
  historyTitle: { fa: 'تاریخچه و پیشرفت', en: 'History & Progress', ar: 'السجل والتقدم' },
  historyReportSection: { fa: 'گزارش‌گیری', en: 'Report', ar: 'التقرير' },
  historyFromDate: { fa: 'از تاریخ', en: 'From date', ar: 'من تاريخ' },
  historyToDate: { fa: 'تا تاریخ', en: 'To date', ar: 'إلى تاريخ' },
  historySelectDate: { fa: 'انتخاب تاریخ', en: 'Select date', ar: 'اختر التاريخ' },
  historyCopyReport: { fa: 'کپی گزارش برای AI', en: 'Copy report for AI', ar: 'نسخ التقرير للذكاء الاصطناعي' },
  // {n} is replaced with the session count by the caller (HistoryTab).
  historyCopySuccessTemplate: {
    fa: 'گزارش {n} تمرین کپی شد',
    en: '{n} workout report(s) copied',
    ar: 'تم نسخ تقرير {n} تمرين',
  },
  historySelectRange: { fa: 'لطفاً بازه تاریخ را انتخاب کنید', en: 'Please select a date range', ar: 'يرجى اختيار نطاق التاريخ' },
  historyNoSessionsInRange: { fa: 'تمرینی در این بازه تاریخی یافت نشد', en: 'No workouts found in this range', ar: 'لا توجد تمارين في هذا النطاق' },
  historyCopyFailed: { fa: 'کپی کردن ناموفق بود', en: 'Copy failed', ar: 'فشل النسخ' },
  historyPastWorkouts: { fa: 'تمرین‌های گذشته', en: 'Past Workouts', ar: 'التمارين السابقة' },
  // {exercises} and {sets} are replaced with counts by the caller (HistoryTab).
  historySessionSummaryTemplate: {
    fa: '{exercises} حرکت · {sets} ست',
    en: '{exercises} exercises · {sets} sets',
    ar: '{exercises} تمرين · {sets} مجموعة',
  },
  historyNoHistory: { fa: 'هنوز تمرینی به پایان نرسانده‌اید', en: "You haven't finished a workout yet", ar: 'لم تُنهِ أي تمرين بعد' },
  historyEdit: { fa: 'ویرایش', en: 'Edit', ar: 'تعديل' },
  historyEditTitle: { fa: 'ویرایش تمرین', en: 'Edit Workout', ar: 'تعديل التمرين' },
  historyDeleteSet: { fa: 'حذف ست', en: 'Delete set', ar: 'حذف المجموعة' },
  historyWeight: { fa: 'وزنه (kg)', en: 'Weight (kg)', ar: 'الوزن (كجم)' },
  historyReps: { fa: 'تکرار', en: 'Reps', ar: 'التكرارات' },
  historyNote: { fa: 'یادداشت', en: 'Note', ar: 'ملاحظة' },
  historyUpdateSuccess: { fa: 'تمرین به‌روزرسانی شد', en: 'Workout updated', ar: 'تم تحديث التمرين' },
  historyUpdateFailed: { fa: 'به‌روزرسانی ناموفق بود', en: 'Update failed', ar: 'فشل التحديث' },
  historyNoSets: { fa: 'ستی برای این حرکت باقی نمانده', en: 'No sets left for this exercise', ar: 'لا توجد مجموعات متبقية لهذا التمرين' },

  // --- AI coach tab ------------------------------------------------------------
  coachTitle: { fa: 'مربی من', en: 'My Coach', ar: 'مدربي' },
  coachGetAnalysis: { fa: 'دریافت تحلیل عملکرد', en: 'Get Performance Analysis', ar: 'الحصول على تحليل الأداء' },
  coachAnalyzing: { fa: 'در حال تحلیل...', en: 'Analyzing...', ar: 'جارٍ التحليل...' },
  coachResultTitle: { fa: 'تحلیل مربی هوشمند', en: 'AI Coach Analysis', ar: 'تحليل المدرب الذكي' },
  coachEmptyState: {
    fa: 'برای دریافت تحلیل عملکرد و پیشنهادهای شخصی‌سازی‌شده، دکمه بالا را بزنید',
    en: 'Tap the button above to get a performance analysis and personalized suggestions',
    ar: 'اضغط على الزر أعلاه للحصول على تحليل الأداء واقتراحات مخصصة',
  },
  coachGoalLabel: { fa: 'هدف تمرینی (اختیاری)', en: 'Training goal (optional)', ar: 'الهدف التدريبي (اختياري)' },
  coachGoalMuscle: { fa: 'عضله‌سازی', en: 'Muscle Building', ar: 'بناء العضلات' },
  coachGoalFatLoss: { fa: 'چربی‌سوزی', en: 'Fat Loss', ar: 'حرق الدهون' },
  coachGoalRecovery: { fa: 'ریکاوری', en: 'Recovery', ar: 'التعافي' },
}

// Looks up `key` in the current `language`, falling back to Persian (the
// dictionary's most complete language) and then the raw key so a missing
// translation never renders as a blank string.
export function translate(key, language) {
  const entry = translations[key]
  if (!entry) return key
  return entry[language] ?? entry.fa ?? key
}

// Goal → instruction text spliced into the AI coach report (see
// AiCoachTab.jsx / useAiCoach.js). Kept in Persian regardless of UI
// language since the whole ai-coach prompt/response pipeline is Persian
// (see supabase/functions/ai-coach/index.ts) — mixing in an English
// instruction block would be inconsistent with the rest of the payload.
export const AI_GOAL_INSTRUCTIONS = {
  muscle:
    '[هدف انتخابی کاربر: عضله‌سازی] لطفاً پیشنهادهایت را با تمرکز بر افزایش تدریجی وزنه (اورلود پیش‌رونده)، حجم کافی تمرین و تناوب مناسب هر گروه عضلانی ارائه بده.',
  fatLoss:
    '[هدف انتخابی کاربر: چربی‌سوزی] لطفاً پیشنهادهایت را با تمرکز بر تراکم تمرین (زمان استراحت کوتاه‌تر)، تنوع حرکات و حفظ انگیزه در کنار کالری‌سوزی ارائه بده.',
  recovery:
    '[هدف انتخابی کاربر: ریکاوری] لطفاً پیشنهادهایت را با تمرکز بر جلوگیری از تمرین‌زدگی، اهمیت استراحت کافی بین جلسات و کاهش هوشمندانه حجم/شدت در صورت نیاز ارائه بده.',
}
