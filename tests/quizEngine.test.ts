// ============ اختبارات محرك الاختبارات ============
// كل شيء حتمي: نفس البذرة → نفس النتيجة دائمًا.

import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  hashString,
  seededRandomInt,
  seededShuffle,
  balancePick,
  shuffledMcq,
  assembleQuiz,
  computeTotalPoints,
} from '../src/lib/quizEngine'
import { makeQuestion } from './helpers'

describe('mulberry32', () => {
  it('نفس البذرة تعطي نفس التسلسل دائمًا', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('بذر مختلف يعطي تسلسلًا مختلفًا عمليًا', () => {
    const a = Array.from({ length: 20 }, () => mulberry32(1)())
    const b = Array.from({ length: 20 }, () => mulberry32(2)())
    expect(a).not.toEqual(b)
  })

  it('القيم داخل المجال [0,1)', () => {
    const rnd = mulberry32(999)
    for (let i = 0; i < 500; i++) {
      const v = rnd()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashString', () => {
  it('حتمي ومستقر', () => {
    expect(hashString('quiz-0001')).toBe(hashString('quiz-0001'))
    expect(hashString('quiz-0001')).not.toBe(hashString('quiz-0002'))
  })

  it('مختلف طورًا لسلسلة تختلف بترتيب الأحرف', () => {
    expect(hashString('ab')).not.toBe(hashString('ba'))
  })
})

describe('seededRandomInt', () => {
  it('القيم داخل [0, max)', () => {
    const rnd = mulberry32(42)
    for (let i = 0; i < 300; i++) {
      const v = seededRandomInt(rnd, 10)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(10)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('max = 0 يعطي 0 دون طرح خطأ على القسمة', () => {
    const rnd = mulberry32(7)
    expect(seededRandomInt(rnd, 0)).toBe(0)
  })
})

describe('seededShuffle / shuffleArray', () => {
  it('حتمية، نفس البذرة → نفس الترتيب', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(seededShuffle(src, 1000)).toEqual(seededShuffle(src, 1000))
  })

  it('التبديل تقاطعي: نفس العناصر والطول دون تكرار', () => {
    const src = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const out = seededShuffle(src, 77)
    expect(out).toHaveLength(src.length)
    expect([...out].map((x) => x.id).sort((a, b) => a - b)).toEqual(src.map((x) => x.id))
  })

  it('لا يعدّل المصفوفة الأصلية', () => {
    const src = [1, 2, 3, 4, 5]
    const before = [...src]
    seededShuffle(src, 5)
    expect(src).toEqual(before)
  })

  it('ترتيب مختلف لغالبية البذور (خلط حقيقي وليس هوية)', () => {
    const src = Array.from({ length: 12 }, (_, i) => i)
    let changed = 0
    for (let seed = 0; seed < 5; seed++) {
      if (seededShuffle(src, seed).some((v, i) => v !== i)) changed++
    }
    expect(changed).toBeGreaterThan(0)
  })
})

describe('balancePick', () => {
  it('لا يكرر أي سؤال مهما كان العدد', () => {
    const pool = Array.from({ length: 30 }, (_, i) => makeQuestion({ id: `bq-${i}`, difficulty: 'medium' }))
    for (const seed of [0, 1, 12345, 987654]) {
      const picked = balancePick(pool, 10, seed)
      expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length)
      expect(picked).toHaveLength(10)
    }
  })

  it('يحقق توزيع 40% سهل / 40% متوسط / 20% صعب مع بنك متوازن', () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `e-${i}`, difficulty: 'easy' as const })),
      ...Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `m-${i}`, difficulty: 'medium' as const })),
      ...Array.from({ length: 4 }, (_, i) => makeQuestion({ id: `h-${i}`, difficulty: 'hard' as const })),
    ]
    const picked = balancePick(pool, 10, 5) // 10 أسئلة من بنك 20
    expect(picked.filter((q) => q.difficulty === 'easy')).toHaveLength(4)
    expect(picked.filter((q) => q.difficulty === 'medium')).toHaveLength(4)
    expect(picked.filter((q) => q.difficulty === 'hard')).toHaveLength(2)
  })

  it('يكمل من الغيّرات حين لا تكفي فئة معينة', () => {
    const pool = [
      ...Array.from({ length: 2 }, (_, i) => makeQuestion({ id: `h-${i}`, difficulty: 'hard' as const })),
      ...Array.from({ length: 8 }, (_, i) => makeQuestion({ id: `e-${i}`, difficulty: 'easy' as const })),
    ]
    const picked = balancePick(pool, 10, 11) // 10 من بنك 10 → توزيع متوازن ثم إكمال بالبقية
    expect(picked).toHaveLength(10)
    expect(new Set(picked.map((q) => q.id)).size).toBe(10)
  })

  it('عدد أكبر من البنك يعيد كل البنك (بترتيب مخلوط)', () => {
    const pool = Array.from({ length: 6 }, (_, i) => makeQuestion({ id: `x-${i}` }))
    const picked = balancePick(pool, 20, 3)
    expect(picked).toHaveLength(6)
    expect(new Set(picked.map((q) => q.id)).size).toBe(6)
  })
})

describe('shuffledMcq', () => {
  it('يحفظ صحة الإجابة: الخيار الصحيح في موضع answerIdx الجديد', () => {
    const q = makeQuestion({ options: ['أ', 'ب', 'ج', 'د'], answerIdx: 1 }) // الصحيح «ب»
    for (const seed of [0, 1, 42, 777]) {
      const m = shuffledMcq(q, mulberry32(seed))
      expect(m.options).toHaveLength(4)
      const correctText = q.options[q.answerIdx]
      expect(m.options[m.answerIdx]).toBe(correctText)
      // لا فقد ولا تكرار
      expect([...m.options].sort()).toEqual([...q.options].sort())
    }
  })

  it('حتمي بنفس البذرة', () => {
    const q = makeQuestion()
    expect(shuffledMcq(q, mulberry32(9))).toEqual(shuffledMcq(q, mulberry32(9)))
  })

  it('سؤال غير MCQ يعاد كما هو', () => {
    const tf = makeQuestion({ kind: 'tf', options: [] })
    const m = shuffledMcq(tf, mulberry32(1))
    expect(m.options).toEqual([])
  })
})

describe('computeTotalPoints', () => {
  it('يجمع النقاط', () => {
    const qs = [makeQuestion({ points: 2 }), makeQuestion({ points: 5 }), makeQuestion({ points: 3 })]
    expect(computeTotalPoints(qs)).toBe(10)
  })

  it('بنك فارغ = 0', () => {
    expect(computeTotalPoints([])).toBe(0)
  })
})

describe('assembleQuiz', () => {
  const questions = Array.from({ length: 8 }, (_, i) =>
    makeQuestion({ id: `v-${i}`, prompt: `س${i}`, options: ['1', '2', '3', '4'], answerIdx: 0 }),
  )

  it('نسخة واحدة عند إلغاء نسختين (أ/ب)', () => {
    const out = assembleQuiz({ questions, shuffle: false, mixOptions: false, twoVersions: false }, 7)
    expect(out).toHaveLength(1)
    expect(out[0]!.label).toBe('')
    expect(out[0]!.questions).toHaveLength(8)
    // بلا خلط: ترتيب المصدر كما هو
    expect(out[0]!.questions.map((q) => q.prompt)).toEqual(questions.map((q) => q.prompt))
  })

  it('نسختان أ/ب ببذرتين مختلفتين عند التفعيل', () => {
    const quiz = { questions, shuffle: true, mixOptions: true, twoVersions: true }
    const out = assembleQuiz(quiz, 7)
    expect(out).toHaveLength(2)
    expect(out[0]!.label).toBe('أ')
    expect(out[1]!.label).toBe('ب')
    expect(out[0]!.seed).not.toBe(out[1]!.seed)
    // خلط حقيقي: النسختان ليستا بنفس ترتيب المصدر بالضرورة، لكن كل نسخة تضم كل الأسئلة
    for (const v of out) {
      expect(new Set(v.questions.map((q) => q.id))).toEqual(new Set(questions.map((q) => q.id)))
    }
  })

  it('حتمي: نفس المدخلات → نفس المخرجات حرفيًا', () => {
    const quiz = { questions, shuffle: true, mixOptions: true, twoVersions: true }
    const a = assembleQuiz(quiz, 99)
    const b = assembleQuiz(quiz, 99)
    expect(a).toEqual(b)
  })

  it('خلط الخيارات يحفظ صحة الإجابة في كل النسخ', () => {
    const quiz = { questions, shuffle: true, mixOptions: true, twoVersions: true }
    const out = assembleQuiz(quiz, 21)
    for (const v of out) {
      for (const q of v.questions) {
        if (q.kind === 'mcq') {
          // كل خيار السؤال الأصلي موجود مرة واحدة، والصحيح في موضع answerIdx
          const original = questions.find((o) => o.id === q.id)!
          expect([...q.options].sort()).toEqual([...original.options].sort())
          expect(q.options[q.answerIdx]).toBe(original.options[original.answerIdx])
        }
      }
    }
  })

  it('الورقة والمفتاح من نفس الجلسة متوافقان (نفس source بنفس البذرة)', () => {
    const quiz = { questions, shuffle: true, mixOptions: true, twoVersions: false }
    const paper = assembleQuiz(quiz, 33)
    const key = assembleQuiz(quiz, 33)
    expect(paper[0]!.questions.map((q) => q.answerIdx)).toEqual(key[0]!.questions.map((q) => q.answerIdx))
  })
})
