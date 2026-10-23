import type { Difficulty, QuestionKind, QuizDoc, QuizQuestion } from './types'

// ============ محرك الاختبارات ============
// عمليات حتمية قابلة للاختبار: بذرة عشوائية، تبديل، موازنة الصعوبة، نسخ (أ/ب)، وحساب مجموع النقاط.

/** مولّد أرقام شبه عشوائي حتمي (mulberry32) — نفس البذرة تعطي نفس التسلسل دائمًا */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** تجزئة FNV-1a لسلسلة نصية إلى عدد صحيح موجب */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function seededRandomInt(rnd: () => number, max: number): number {
  return Math.floor(rnd() * max) % Math.max(max, 1)
}

/** خلط مصفوفة (Fisher–Yates) اعتمادًا على مولّد rnd */
export function shuffleArray<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = seededRandomInt(rnd, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  return shuffleArray(arr, mulberry32(seed))
}

const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  easy: 0.4,
  medium: 0.4,
  hard: 0.2,
}

/**
 * اختيار موازَن للصعوبة: يسعى لتوزيع 40% سهل، 40% متوسط، 20% صعب
 * ثم يكمل من المجموعات المتبقية. لا يكرّر أي سؤال.
 */
export function balancePick(questions: QuizQuestion[], count: number, seed: number): QuizQuestion[] {
  const rnd = mulberry32(seed)
  const bank = shuffleArray(questions, rnd)
  if (count >= bank.length) return bank

  const byDiff: Record<Difficulty, QuizQuestion[]> = { easy: [], medium: [], hard: [] }
  for (const q of bank) byDiff[q.difficulty].push(q)

  const picked: QuizQuestion[] = []
  for (const [d, weight] of Object.entries(DIFFICULTY_WEIGHTS) as [Difficulty, number][]) {
    const take = Math.min(Math.floor(count * weight), byDiff[d].length)
    picked.push(...byDiff[d].slice(0, take))
  }
  if (picked.length < count) {
    const remaining = bank.filter((q) => !picked.includes(q))
    picked.push(...remaining.slice(0, count - picked.length))
  }
  return picked.slice(0, count)
}

export function computeTotalPoints(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + (Number.isFinite(q.points) ? q.points : 0), 0)
}

/** خلط خيارات سؤال الاختيار مع تعديل فهرس الإجابة الصحيحة بما يحفظ صحّتها */
export function shuffledMcq(
  q: QuizQuestion,
  rnd: () => number,
): { options: string[]; answerIdx: number } {
  if (q.kind !== 'mcq') return { options: q.options, answerIdx: q.answerIdx }
  const pairs = q.options.map((opt, idx) => ({ opt, correct: idx === q.answerIdx }))
  const mixed = shuffleArray(pairs, rnd)
  return {
    options: mixed.map((p) => p.opt),
    answerIdx: Math.max(0, mixed.findIndex((p) => p.correct)),
  }
}

export interface QuizVersion {
  label: string
  seed: number
  questions: QuizQuestion[] // بترتيب العرض، مع خيارات مخلوطة إذا لزم
}

/**
 * توليد نسخ العرض لورقة الاختبار:
 * - نسخة واحدة أو نسختان (أ/ب) بترتيب مختلف.
 * - إذا تفعيل «موازنة الصعوبة» فلن تُعرَض جميع الأسئلة بل المبلغ الموازن حسب عدد الأسئلة المدخل.
 */
export function assembleQuiz(
  quiz: Pick<QuizDoc, 'questions' | 'shuffle' | 'mixOptions' | 'twoVersions'>,
  baseSeed: number,
): QuizVersion[] {
  const versions: QuizVersion[] = []
  const count = quiz.twoVersions ? 2 : 1
  for (let v = 0; v < count; v++) {
    const seed = hashString(`${baseSeed}:${v}`)
    const rnd = mulberry32(seed)
    let questions = quiz.questions
    if (quiz.shuffle) questions = shuffleArray(questions, rnd)
    questions = questions.map((q) => {
      if (quiz.mixOptions && q.kind === 'mcq') {
        const m = shuffledMcq(q, rnd)
        return { ...q, options: m.options, answerIdx: m.answerIdx }
      }
      return q
    })
    versions.push({ label: count === 2 ? (v === 0 ? 'أ' : 'ب') : '', seed, questions })
  }
  return versions
}

export const QUESTION_KINDS: { id: QuestionKind; label: string }[] = [
  { id: 'mcq', label: 'اختيار من متعدد' },
  { id: 'tf', label: 'صح / خطأ' },
  { id: 'short', label: 'إجابة قصيرة' },
  { id: 'essay', label: 'سؤال مقالي' },
]

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
}

export function questionKindLabel(kind: QuestionKind): string {
  return QUESTION_KINDS.find((k) => k.id === kind)?.label ?? ''
}

export const MCQ_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح']

/** هياكل جاهزة لسحبها بضغطة واحدة */
export interface QuizScaffold {
  id: string
  label: string
  hint: string
  make: () => Omit<QuizQuestion, 'id'>[]
}

function emptyQuestion(kind: QuestionKind, points: number, difficulty: Difficulty): Omit<QuizQuestion, 'id'> {
  return {
    kind,
    prompt: '',
    options: kind === 'mcq' ? ['', '', '', ''] : [],
    answerIdx: 0,
    tfAnswer: true,
    modelAnswer: '',
    points,
    difficulty,
  }
}

export const QUIZ_SCAFFOLDS: QuizScaffold[] = [
  {
    id: 'weekly-20',
    label: 'اختبار أسبوعي (20 نقطة)',
    hint: '5 اختيار ×2 + 3 صح/خطأ + 2 قصيرة + 1 مقالي',
    make: () => [
      ...Array.from({ length: 5 }, () => emptyQuestion('mcq', 2, 'medium')),
      ...Array.from({ length: 3 }, () => emptyQuestion('tf', 1, 'easy')),
      ...Array.from({ length: 2 }, () => emptyQuestion('short', 2, 'medium')),
      emptyQuestion('essay', 3, 'hard'),
    ],
  },
  {
    id: 'quick-5',
    label: 'تدريب سريع (5 نقاط)',
    hint: '3 اختيار + 2 صح/خطأ',
    make: () => [
      ...Array.from({ length: 3 }, () => emptyQuestion('mcq', 1, 'easy')),
      ...Array.from({ length: 2 }, () => emptyQuestion('tf', 1, 'easy')),
    ],
  },
  {
    id: 'exam-40',
    label: 'اختبار نهائي (40 نقطة)',
    hint: '15 اختيار ×2 + 5 قصيرة + 2 مقالية',
    make: () => [
      ...Array.from({ length: 15 }, (_, i) => emptyQuestion('mcq', 2, i % 4 === 0 ? 'hard' : 'medium')),
      ...Array.from({ length: 5 }, () => emptyQuestion('short', 1, 'medium')),
      ...Array.from({ length: 2 }, () => emptyQuestion('essay', 2, 'hard')),
    ],
  },
]
