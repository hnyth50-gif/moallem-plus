import type {
  ActivityDoc,
  AppData,
  CertificateDoc,
  CertificateType,
  PlanDoc,
  QuizDoc,
  QuizQuestion,
  ThinkingCard,
  WeekEntry,
  WeekEntryKind,
} from './types'
import { CARD_CATEGORIES, type CardCategory, type Difficulty, type QuestionKind } from './types'
import { emptyData } from './store'

// ============ التحقق من صحة البيانات ============
// يُستخدم في: الاستيراد (تجاهل ملفات تالفة/مشوهة بأمان)، والتحقق من النماذج قبل الحفظ.

export interface ModelErrors {
  /** رسالة الخطأ بحسب حقل النموذج */
  [field: string]: string | undefined
}

/** إسقاط الأسطر الفارغة من قائمة نصوص */
export function dropEmptyStrings(items: string[]): string[] {
  return items.filter((s) => s.trim().length > 0)
}

export function validatePlan(p: PlanDoc): ModelErrors {
  const errors: ModelErrors = {}
  if (!p.title.trim()) errors.title = 'أدخل عنوان الدرس'
  if (!p.subject.trim()) errors.subject = 'حدد المادة'
  if (p.durationMinutes !== undefined && (!Number.isFinite(p.durationMinutes) || p.durationMinutes < 1 || p.durationMinutes > 300))
    errors.durationMinutes = 'المدة بين 1 و300 دقيقة'
  const sectionsInvalid = p.sections.some((s) => s.minutes !== undefined && (s.minutes < 0 || s.minutes > 600))
  if (sectionsInvalid) errors.sections = 'زمن المرحلة يجب أن يكون بين 0 و600 دقيقة'
  return errors
}

export function validateActivity(a: ActivityDoc): ModelErrors {
  const errors: ModelErrors = {}
  if (!a.title.trim()) errors.title = 'أدخل عنوان النشاط'
  if (!a.subject.trim()) errors.subject = 'حدد المادة'
  if (!a.goal.trim()) errors.goal = 'صِف هدف النشاط'
  return errors
}

export function validateQuestion(q: QuizQuestion): string | null {
  if (!q.prompt.trim()) return 'نص السؤال مطلوب'
  if (q.kind === 'mcq') {
    const filled = q.options.map((o) => o.trim())
    if (filled.filter((o) => o.length > 0).length < 2) return 'الإجابة المتعددة تحتاج خياريْن على الأقل'
    if (filled[q.answerIdx]?.trim() === '') return 'حدد الإجابة الصحيحة من الخيارات المعبأة'
  }
  if (q.points < 0 || q.points > 100) return 'النقاط بين 0 و100'
  return null
}

/** حذف الأسئلة غير المعبأة (بدون نص) قبل الحفظ */
export function dropEmptyQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.filter((q) => q.prompt.trim().length > 0)
}

export function validateQuiz(q: QuizDoc): ModelErrors {
  const errors: ModelErrors = {}
  if (!q.title.trim()) errors.title = 'أدخل عنوان الاختبار'
  if (!q.subject.trim()) errors.subject = 'حدد المادة'
  if (q.questions.length === 0) errors.questions = 'أضف سؤالًا واحدًا على الأقل'
  const invalid = q.questions.map(validateQuestion).find(Boolean)
  if (invalid) errors.questions = `سؤال غير مكتمل: ${invalid}`
  if (q.timeMinutes !== undefined && (q.timeMinutes < 0 || q.timeMinutes > 300))
    errors.timeMinutes = 'الزمن بين 0 و300 دقيقة'
  return errors
}

export function validateCard(c: ThinkingCard): ModelErrors {
  const errors: ModelErrors = {}
  if (!c.title.trim()) errors.title = 'أدخل اسم البطاقة'
  if (!c.brief.trim()) errors.brief = 'اكتب تعريفًا موجزًا'
  return errors
}

export function validateWeekEntry(w: WeekEntry): ModelErrors {
  const errors: ModelErrors = {}
  if (!w.title.trim()) errors.title = 'أدخل عنوان المهمة'
  if (w.kind !== 'note' && !w.refId) errors.refId = 'اختر العنصر المرتبط'
  if (!Number.isInteger(w.day) || w.day < 0 || w.day > 6) errors.day = 'اليوم غير صالح'
  return errors
}

export function validateCertificate(c: CertificateDoc): ModelErrors {
  const errors: ModelErrors = {}
  if (!c.studentName.trim()) errors.studentName = 'أدخل اسم الطالب'
  if (c.studentName.trim().length > 60) errors.studentName = 'الاسم طويل جدًا (60 حرفًا كحد أقصى)'
  if (!c.reason.trim()) errors.reason = 'أدخل سبب التقدير'
  if (c.reason.trim().length > 300) errors.reason = 'السبب طويل جدًا (300 حرف كحد أقصى)'
  return errors
}

// ---------- تحقق الملف المستورد ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** رقم اختياري: يُحذف إن لم يوجد أو قيمةً غير رقمية */
function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function asDifficulty(v: unknown): Difficulty {
  return v === 'easy' || v === 'medium' || v === 'hard' ? v : 'medium'
}

function asQuestionKind(v: unknown): QuestionKind {
  return v === 'mcq' || v === 'tf' || v === 'short' || v === 'essay' ? v : 'short'
}

function asCategory(v: unknown): CardCategory {
  return CARD_CATEGORIES.includes(v as CardCategory) ? (v as CardCategory) : 'cooperative'
}

function timestamps(raw: Record<string, unknown>): { createdAt: number; updatedAt: number } {
  const now = 0
  return {
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, num(raw.createdAt, now)),
  }
}

function normalizePlan(raw: Record<string, unknown>): PlanDoc {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    kind: 'plan',
    demo: raw.demo === true ? true : undefined,
    title: str(raw.title, 'خطة بلا عنوان'),
    subject: str(raw.subject),
    grade: str(raw.grade),
    unit: str(raw.unit) || undefined,
    classDate: str(raw.classDate) || undefined,
    durationMinutes: optNum(raw.durationMinutes),
    objectives: strArr(raw.objectives),
    resources: strArr(raw.resources),
    sections: Array.isArray(raw.sections)
      ? raw.sections.slice(0, 30).map((s) => {
          const r = isRecord(s) ? s : {}
          return {
            phase: str(r.phase, 'مرحلة'),
            minutes: num(r.minutes, 0),
            description: str(r.description),
          }
        })
      : [],
    homework: str(raw.homework) || undefined,
    notes: str(raw.notes) || undefined,
  }
}

function normalizeActivity(raw: Record<string, unknown>): ActivityDoc {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    kind: 'activity',
    demo: raw.demo === true ? true : undefined,
    title: str(raw.title, 'نشاط بلا عنوان'),
    subject: str(raw.subject),
    grade: str(raw.grade),
    goal: str(raw.goal),
    strategyId: str(raw.strategyId) || undefined,
    materials: strArr(raw.materials),
    steps: Array.isArray(raw.steps)
      ? raw.steps.slice(0, 30).map((s) => {
          const r = isRecord(s) ? s : {}
          return { text: str(r.text), minutes: r.minutes === undefined ? undefined : num(r.minutes, 0) }
        })
      : [],
    grouping: str(raw.grouping) || undefined,
    assessment: str(raw.assessment) || undefined,
    outcome: str(raw.outcome) || undefined,
    notes: str(raw.notes) || undefined,
  }
}

function normalizeQuestion(raw: Record<string, unknown>): QuizQuestion {
  const kind = asQuestionKind(raw.kind)
  return {
    id: str(raw.id),
    kind,
    prompt: str(raw.prompt),
    options: kind === 'mcq' ? strArr(raw.options).slice(0, 8) : [],
    answerIdx: Math.max(0, Math.round(num(raw.answerIdx, 0))),
    tfAnswer: raw.tfAnswer !== false,
    modelAnswer: str(raw.modelAnswer),
    points: Math.max(0, num(raw.points, 1)),
    difficulty: asDifficulty(raw.difficulty),
    tag: str(raw.tag) || undefined,
  }
}

function normalizeQuiz(raw: Record<string, unknown>): QuizDoc {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    kind: 'quiz',
    demo: raw.demo === true ? true : undefined,
    title: str(raw.title, 'اختبار بلا عنوان'),
    subject: str(raw.subject),
    grade: str(raw.grade),
    unit: str(raw.unit) || undefined,
    timeMinutes: optNum(raw.timeMinutes),
    instructions: str(raw.instructions) || undefined,
    questions: Array.isArray(raw.questions) ? raw.questions.filter(isRecord).map(normalizeQuestion) : [],
    shuffle: raw.shuffle === true,
    mixOptions: raw.mixOptions === true,
    twoVersions: raw.twoVersions === true,
  }
}

function normalizeCard(raw: Record<string, unknown>): ThinkingCard {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    demo: raw.demo === true ? true : undefined,
    title: str(raw.title, 'بطاقة'),
    category: asCategory(raw.category),
    brief: str(raw.brief),
    steps: strArr(raw.steps),
    timing: str(raw.timing),
    suitableFor: str(raw.suitableFor),
    tips: str(raw.tips),
  }
}

function asWeekKind(v: unknown): WeekEntryKind {
  return v === 'plan' || v === 'activity' || v === 'quiz' ? v : 'note'
}

function asCertificateType(v: unknown): CertificateType {
  return v === 'thanks' || v === 'excellence' || v === 'motivation' ? v : 'thanks'
}

function normalizeCertificate(raw: Record<string, unknown>): CertificateDoc {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    demo: raw.demo === true ? true : undefined,
    type: asCertificateType(raw.type),
    studentName: str(raw.studentName, 'طالب'),
    grade: str(raw.grade) || undefined,
    reason: str(raw.reason),
    dateISO: str(raw.dateISO) || undefined,
  }
}

function normalizeWeekEntry(raw: Record<string, unknown>): WeekEntry {
  return {
    ...timestamps(raw),
    id: str(raw.id),
    demo: raw.demo === true ? true : undefined,
    kind: asWeekKind(raw.kind),
    day: Math.min(6, Math.max(0, Math.round(num(raw.day, 0)))),
    title: str(raw.title, 'مهمة بلا عنوان'),
    period: str(raw.period) || undefined,
    refId: str(raw.refId) || undefined,
  }
}

export interface ImportResult {
  ok: boolean
  data?: AppData
  reason?: string
}

/** تحليل ملف نسخة احتياطية: ما يتشوه يُهمل بأمان، وما سليم يبقى */
export function parseImport(raw: unknown): ImportResult {
  if (!isRecord(raw)) return { ok: false, reason: 'الملف ليس كائن JSON صالح' }
  if (raw.version !== 1) return { ok: false, reason: 'إصدار الملف غير مدعوم' }
  const base = emptyData()
  const data: AppData = {
    version: 1,
    savedAt: num(raw.savedAt, Date.now()),
    plans: Array.isArray(raw.plans) ? raw.plans.filter(isRecord).map(normalizePlan) : base.plans,
    activities: Array.isArray(raw.activities)
      ? raw.activities.filter(isRecord).map(normalizeActivity)
      : base.activities,
    quizzes: Array.isArray(raw.quizzes) ? raw.quizzes.filter(isRecord).map(normalizeQuiz) : base.quizzes,
    customCards: Array.isArray(raw.customCards)
      ? raw.customCards.filter(isRecord).map(normalizeCard)
      : base.customCards,
    weekEntries: Array.isArray(raw.weekEntries)
      ? raw.weekEntries.filter(isRecord).map(normalizeWeekEntry)
      : base.weekEntries,
    certificates: Array.isArray(raw.certificates)
      ? raw.certificates.filter(isRecord).map(normalizeCertificate)
      : base.certificates,
    settings: { profile: { name: '', school: '', semester: '' } },
  }
  // الإعدادات (الملف الشخصي) إن وجدت سليمة
  const s = raw.settings
  if (isRecord(s) && isRecord(s.profile)) {
    data.settings.profile = {
      name: str(s.profile.name),
      school: str(s.profile.school),
      semester: str(s.profile.semester),
    }
  }
  // إزالة عناصر بلا معرّف سليم
  const validId = /^[a-zA-Z0-9-]{6,}$/
  data.plans = data.plans.filter((d) => validId.test(d.id))
  data.activities = data.activities.filter((d) => validId.test(d.id))
  data.quizzes = data.quizzes.filter((d) => validId.test(d.id))
  data.customCards = data.customCards.filter((d) => validId.test(d.id))
  data.weekEntries = data.weekEntries.filter((d) => validId.test(d.id))
  data.certificates = data.certificates.filter((d) => validId.test(d.id))
  return { ok: true, data }
}
