// ============ اختبارات البيانات التجريبية (seed.ts) ============
// العنصر التجريبي يجب أن يكون واضحًا وقابلًا للحذف الجماعي دون مسّ بيانات المعلم.

import { describe, it, expect } from 'vitest'
import { createDemoData, applyDemoToData, DEMO_PREFIX } from '../src/lib/seed'
import { emptyData, stripDemo } from '../src/lib/store'
import { parseImport } from '../src/lib/validate'
import { makePlan, makeQuiz } from './helpers'

describe('createDemoData', () => {
  const demo = createDemoData()

  it('عنصر واحد من كل نوع', () => {
    expect(demo.plans).toHaveLength(1)
    expect(demo.activities).toHaveLength(1)
    expect(demo.quizzes).toHaveLength(1)
    expect(demo.customCards).toHaveLength(1)
  })

  it('كل العناصر موسومة demo:true وعنوانها يبدأ بـ«تجريبي»', () => {
    for (const item of [...demo.plans, ...demo.activities, ...demo.quizzes, ...demo.customCards]) {
      expect(item.demo).toBe(true)
      expect(item.title).toContain('تجريبي')
    }
  })

  it('المعرّفات ببادئة demo-0001- وقبولًا مضمونًا لدى مستورد البيانات', () => {
    const ids = [...demo.plans, ...demo.activities, ...demo.quizzes, ...demo.customCards].map((d) => d.id)
    for (const id of ids) {
      expect(id.startsWith(DEMO_PREFIX)).toBe(true)
      // نفس قاعدة المعرّفات لدى parseImport: حروف/أرقام/شرطات، 6+ حرفًا
      expect(/^[a-zA-Z0-9-]{6,}$/.test(id)).toBe(true)
    }
    // مثال لضمان قابلية الاستيراد (مصفوفة أسئلة الاختبار أيضًا)
    const reimport = parseImport(JSON.parse(
      JSON.stringify({ ...emptyData(), ...demo, version: 1 }),
    ))
    expect(reimport.ok).toBe(true)
    expect(reimport.data!.plans).toHaveLength(1)
    expect(reimport.data!.quizzes[0]!.questions.length).toBeGreaterThan(3)
    for (const q of reimport.data!.quizzes[0]!.questions) {
      expect(q.id.startsWith(DEMO_PREFIX)).toBe(true)
    }
  })

  it('أسئلة الاختبار التجريبي مكتملة صياغة (نسخة سليمة)', () => {
    const quiz = demo.quizzes[0]!
    expect(quiz.shuffle).toBe(true)
    expect(quiz.mixOptions).toBe(true)
    for (const q of quiz.questions) {
      expect(q.prompt.trim().length).toBeGreaterThan(0)
      expect(q.points).toBeGreaterThanOrEqual(0)
      expect(q.points).toBeLessThanOrEqual(100)
    }
  })

  it('خطة تجريبية بأقسام زمنية تجمع المدة', () => {
    const plan = demo.plans[0]!
    expect(plan.durationMinutes).toBeGreaterThan(0)
    const sum = plan.sections.reduce((s, r) => s + r.minutes, 0)
    expect(sum).toBe(plan.durationMinutes)
  })
})

describe('applyDemoToData', () => {
  it('يضيف العناصر التجريبية في المقدمة ودون المسّ ببيانات المعلم', () => {
    const base = emptyData()
    base.plans = [makePlan({ id: 'teacher-plan' })]
    base.quizzes = [makeQuiz({ id: 'teacher-quiz' })]

    const merged = applyDemoToData(base)
    expect(merged.plans).toHaveLength(2)
    expect(merged.plans[0]!.demo).toBe(true)
    expect(merged.plans[1]!.id).toBe('teacher-plan')
    expect(merged.quizzes).toHaveLength(2)
    expect(merged.quizzes[0]!.demo).toBe(true)
    // الملف الشخصي كما هو
    expect(merged.settings.profile).toEqual(base.settings.profile)
  })

  it('data الجاهزة تركز على الحقول اللازمة (جولة demo ثم stripDemo تصل الأصل)', () => {
    const base = emptyData()
    base.plans = [makePlan({ id: 'teacher-plan' })]
    base.activities = []
    base.quizzes = []
    base.customCards = []

    const afterApply = stripDemo(applyDemoToData(base))
    expect(afterApply.plans.map((p) => p.id)).toEqual(['teacher-plan'])
    expect(afterApply.activities).toHaveLength(0)
    expect(afterApply.quizzes).toHaveLength(0)
    expect(afterApply.customCards).toHaveLength(0)
  })
})
