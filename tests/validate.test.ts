// ============ اختبارات التحقق من البيانات والاستيراد (validate.ts) ============

import { describe, it, expect } from 'vitest'
import {
  dropEmptyStrings,
  dropEmptyQuestions,
  validatePlan,
  validateActivity,
  validateQuiz,
  validateQuestion,
  validateCard,
  parseImport,
} from '../src/lib/validate'
import { emptyData } from '../src/lib/store'
import { makePlan, makeActivity, makeQuiz, makeQuestion, makeCard } from './helpers'

describe('dropEmptyStrings', () => {
  it('يسقط الأسطر الفارغة والمسافات فقط', () => {
    expect(dropEmptyStrings(['أ', '  ', '', 'ب'])).toEqual(['أ', 'ب'])
    expect(dropEmptyStrings([])).toEqual([])
  })
})

describe('dropEmptyQuestions', () => {
  it('يسقط الأسئلة بدون نص سؤال', () => {
    const qs = [makeQuestion(), makeQuestion({ id: 'q2', prompt: '   ' })]
    const out = dropEmptyQuestions(qs)
    expect(out.map((q) => q.id)).toEqual(['q-0001'])
  })
})

describe('validatePlan', () => {
  it('خطة سليمة بلا أخطاء', () => {
    expect(validatePlan(makePlan())).toEqual({})
  })

  it('العنوان والمادة يفرضان رسائل عربية', () => {
    const errors = validatePlan(makePlan({ title: '   ', subject: '' }))
    expect(errors.title).toBe('أدخل عنوان الدرس')
    expect(errors.subject).toBe('حدد المادة')
  })

  it('المدة خارج المدى (0 أو 301) ترفض', () => {
    // المدة خارج المدى (0 زمن غير مسموح، 300 الأعم)
    expect(validatePlan(makePlan({ durationMinutes: 0 })).durationMinutes).toContain('المدة بين 1 و300 دقيقة')
    expect(validatePlan(makePlan({ durationMinutes: 301 })).durationMinutes).toContain('المدة بين 1 و300 دقيقة')
    expect(validatePlan(makePlan({ durationMinutes: 300 })).durationMinutes).toBeUndefined()
  })

  it('زمن المرحلة خارج المدى يخطئ', () => {
    const errors = validatePlan(makePlan({ sections: [{ phase: 'أ', minutes: -1, description: '' }] }))
    expect(errors.sections).toContain('بين 0 و600')
  })

  it('المدة غير المحددة صيغة مسموحة', () => {
    // المدة undefined مسموحية (خطة بلا زمن)
    expect(validatePlan(makePlan({ durationMinutes: undefined }))).toEqual({})  })
})

describe('validateActivity', () => {
  it('نشاط سليم بلا أخطاء', () => {
    expect(validateActivity(makeActivity())).toEqual({})
  })

  it('القيمة والهدف والإجابة مطلوبة', () => {
    const errors = validateActivity(makeActivity({ title: '', subject: '', goal: '' }))
    expect(errors.title).toBe('أدخل عنوان النشاط')
    expect(errors.subject).toBe('حدد المادة')
    expect(errors.goal).toBe('صِف هدف النشاط')
  })
})

describe('validateQuestion', () => {
  it('نص السؤال مطلوب', () => {
    expect(validateQuestion(makeQuestion({ prompt: '  ' }))).toBe('نص السؤال مطلوب')
  })

  it('MCQ يفرض خياريْن على الأقل', () => {
    expect(validateQuestion(makeQuestion({ options: ['خيار واحد'], answerIdx: 0 }))).toContain('خياريْن على الأقل')
  })

  it('MCQ وجود خياريْن معبأيْن مع إجابة على خيار فارغ تكشف الخطأ', () => {
    // خياريْن معبأيْن + الإجابة عند أول خيار معبأ = سليم
    expect(validateQuestion(makeQuestion({ options: ['أ', 'ب', '', ''], answerIdx: 0 }))).toBeNull()
    // نفس الخيارات لكن الإجابة عند خيار فارغ = خطأ
    expect(validateQuestion(makeQuestion({ options: ['أ', 'ب', '', ''], answerIdx: 2 }))).toContain('حدد الإجابة')
  })

  it('صح/خطأ لا يحتاج خيارات', () => {
    expect(validateQuestion(makeQuestion({ kind: 'tf', options: [] }))).toBeNull()
  })

  it('النقاط بين 0 و100', () => {
    expect(validateQuestion(makeQuestion({ points: 150 }))).toContain('النقاط بين 0 و100')
    expect(validateQuestion(makeQuestion({ points: -3 }))).toContain('النقاط بين 0 و100')
  })
})

describe('validateQuiz', () => {
  it('اختبار سليم بلا أخطاء', () => {
    expect(validateQuiz(makeQuiz())).toEqual({})
  })

  it('سؤال واحد على الأقل مطلوب', () => {
    expect(validateQuiz(makeQuiz({ questions: [] })).questions).toBe('أضف سؤالًا واحدًا على الأقل')
  })

  it('سؤال غير مكتمل وفيه رسالة تذكير', () => {
    const quiz = makeQuiz({ questions: [makeQuestion({ prompt: '' })] })
    const errors = validateQuiz(quiz)
    expect(errors.questions).toContain('سؤال غير مكتمل')
  })

  it('زمن الاختبار بين 0 و300', () => {
    expect(validateQuiz(makeQuiz({ timeMinutes: 500 })).timeMinutes).toContain('الزمن بين 0 و300')
    expect(validateQuiz(makeQuiz({ timeMinutes: undefined })).timeMinutes).toBeUndefined()
  })
})

describe('validateCard', () => {
  it('بطاقة سليمة بلا أخطاء', () => {
    expect(validateCard(makeCard())).toEqual({})
  })

  it('الاسم والتعريف مطلوبان', () => {
    const errors = validateCard(makeCard({ title: '', brief: '' }))
    expect(errors.title).toBe('أدخل اسم البطاقة')
    expect(errors.brief).toBe('اكتب تعريفًا موجزًا')
  })
})

describe('parseImport', () => {
  it('يرفض ما ليس كائنًا وإصدارات غير مدعومة', () => {
    expect(parseImport(null).ok).toBe(false)
    expect(parseImport('نص').ok).toBe(false)
    expect(parseImport([1, 2]).ok).toBe(false)
    expect(parseImport({ version: 2 }).ok).toBe(false)
  })

  it('يستورد نسخة كاملة سليمة وتحفظ مواضعها', () => {
    const data = emptyData()
    data.plans = [makePlan()]
    data.activities = [makeActivity()]
    data.quizzes = [makeQuiz()]
    data.customCards = [makeCard()]
    data.settings.profile = { name: 'معلم اختبار', school: 'المدرسة', semester: 'الفصل الأول' }

    const result = parseImport(JSON.parse(JSON.stringify(data)))
    expect(result.ok).toBe(true)
    expect(result.data!.plans).toHaveLength(1)
    expect(result.data!.quizzes![0]!.questions).toHaveLength(2)
    expect(result.data!.quizzes![0]!.questions[0]!.options).toEqual(['2', '-2', '8', '-8'])
    expect(result.data!.settings.profile.name).toBe('معلم اختبار')
  })

  it('يرفض عناصر بلا معرف سليم ويبقي السليم', () => {
    const raw = {
      version: 1,
      plans: [
        { id: 'valid-plan-0001', title: 'سليمة' },
        { id: 'x', title: 'قصيرة جدًا' }, // المعرف أقصر من 6
        { id: 'معرف-عربي-01', title: 'غير مسموح عربيًا' },
      ],
    }
    const result = parseImport(raw)
    expect(result.ok).toBe(true)
    expect(result.data!.plans).toHaveLength(1)
    expect(result.data!.plans[0]!.title).toBe('سليمة')
  })

  it('حقول مفقودة أو مشوهة تعطب بأمان (بدون رمي استثناءات)', () => {
    const raw = {
      version: 1,
      plans: [
        {
          id: 'plan-odd-0001',
          title: 42, // ليس نصًا
          durationMinutes: 'نصف', // ليس رقمًا
          objectives: 'ليست مصفوفة',
          sections: 'ليست مصفوفة',
          createdAt: 'اليوم',
          updatedAt: null,
        },
      ],
      quizzes: [{ id: 'quiz-odd-0001', questions: 'كل شيء' }],
      customCards: [{ id: 'card-odd-0001', steps: null, category: 'تصنيف مجهول' }],
    }
    expect(() => parseImport(raw)).not.toThrow()
    const r = parseImport(raw)
    expect(r.ok).toBe(true)

    const plan = r.data!.plans[0]!
    expect(plan.title).toBe('خطة بلا عنوان')
    expect(plan.durationMinutes).toBeUndefined()
    expect(plan.objectives).toEqual([])
    expect(plan.sections).toEqual([])

    const quiz = r.data!.quizzes[0]!
    expect(quiz.questions).toEqual([])

    const card = r.data!.customCards[0]!
    expect(card.steps).toEqual([])
    expect(card.category).toBe('cooperative') // معيار افتراضي عند تصنيف مجهول
  })

  it('نوع السؤال وصعوبته غير المعرَّفيْن يعودان للافتراضي', () => {
    const raw = {
      version: 1,
      quizzes: [
        {
          id: 'quiz-odd-0002',
          questions: [{ id: 'q-0001', kind: 'متعدد جماجم بشكر', difficulty: 'سهل جدا' }],
        },
      ],
    }
    const r = parseImport(raw)
    const q = r.data!.quizzes[0]!.questions[0]!
    expect(q.kind).toBe('short')
    expect(q.difficulty).toBe('medium')
  })

  it('علم demo يُقرأ لكل الأنواع', () => {
    const raw = {
      version: 1,
      plans: [{ id: 'plan-demo-0001', demo: true }],
      quizzes: [{ id: 'quiz-demo-0001', demo: true }],
      customCards: [{ id: 'card-demo-0001', demo: true }],
    }
    const r = parseImport(raw)
    expect(r.data!.plans[0]!.demo).toBe(true)
    expect(r.data!.quizzes[0]!.demo).toBe(true)
    expect(r.data!.customCards[0]!.demo).toBe(true)
  })

  it('ملف مستورد ثم سلسلق ثم تحليل ثاني = بلا تغيير عمل (idempotent)', () => {
    const data = emptyData()
    data.quizzes = [makeQuiz()]
    const first = parseImport(JSON.parse(JSON.stringify(data)))
    const second = parseImport(JSON.parse(JSON.stringify(first.data)))
    expect(second.data).toEqual(first.data)
  })
})
