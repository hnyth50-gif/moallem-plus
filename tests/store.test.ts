// ============ اختبارات عمليات المتجر (store.ts) ============

import { describe, it, expect } from 'vitest'
import {
  emptyData,
  upsertIn,
  removeFrom,
  findById,
  sortByUpdated,
  sortAlphabetically,
  matchesQuery,
  stripDemo,
  mergeData,
  backupFileName,
} from '../src/lib/store'
import { makePlan, makeActivity, makeQuiz, makeCard } from './helpers'

describe('emptyData', () => {
  it('بنية فارغة سليمة', () => {
    const d = emptyData()
    expect(d.version).toBe(1)
    expect(d.plans).toEqual([])
    expect(d.activities).toEqual([])
    expect(d.quizzes).toEqual([])
    expect(d.customCards).toEqual([])
    expect(d.settings.profile).toEqual({ name: '', school: '', semester: '' })
  })
})

describe('upsertIn / removeFrom / findById', () => {
  it('عنصر جديد يُدرج في المقدمة', () => {
    const list = [makePlan({ id: 'a', updatedAt: 1, title: 'أ' })]
    const out = upsertIn(list, makePlan({ id: 'b', updatedAt: 2, title: 'ب' }))
    expect(out).toHaveLength(2)
    expect(out[0]!.id).toBe('b')
  })

  it('عنصر موجود يُستبدل في مكانه لا في المقدمة', () => {
    const a = makePlan({ id: 'a', title: 'أقديم' })
    const b = makePlan({ id: 'b', title: 'ب' })
    const out = upsertIn([a!, b!], makePlan({ id: 'a', title: 'أجديد' }))
    expect(out).toHaveLength(2)
    expect(out[0]!.title).toBe('أجديد')
    expect(out[1]!.id).toBe('b')
  })

  it('removeFrom يحذف بالمعرّف فقط', () => {
    const a = makePlan({ id: 'a' })
    const b = makePlan({ id: 'b' })
    const out = removeFrom([a!, b!], 'a')
    expect(out.map((d) => d.id)).toEqual(['b'])
    // حذف غير موجود يعيد نفس القائمة
    expect(removeFrom([a!, b!], 'zz').length).toBe(2)
  })

  it('findById يعيد العنصر المطلوب أو undefined', () => {
    const list = [makePlan({ id: 'a' })]
    expect(findById(list, 'a')!.id).toBe('a')
    expect(findById(list, 'x')).toBeUndefined()
  })
})

describe('sortByUpdated / sortAlphabetically', () => {
  it('الأحدث أولًا مع desc (الافتراضي)', () => {
    const list = [
      makePlan({ id: '1', updatedAt: 100 }),
      makePlan({ id: '2', updatedAt: 300 }),
      makePlan({ id: '3', updatedAt: 200 }),
    ]
    expect(sortByUpdated(list).map((d) => d.id)).toEqual(['2', '3', '1'])
  })

  it('الأقدم أولًا مع asc', () => {
    const list = [
      makePlan({ id: '1', updatedAt: 100 }),
      makePlan({ id: '2', updatedAt: 300 }),
      makePlan({ id: '3', updatedAt: 200 }),
    ]
    expect(sortByUpdated(list, 'asc').map((d) => d.id)).toEqual(['1', '3', '2'])
  })

  it('sortAlphabetically بالعربية', () => {
    const list = [makeCard({ title: 'كلمة' }), makeCard({ title: 'ألف' }), makeCard({ title: 'بين' })]
    expect(sortAlphabetically(list).map((c) => c.title)).toEqual(['ألف', 'بين', 'كلمة'])
  })
})

describe('matchesQuery', () => {
  const plan = makePlan({ title: 'خطة درس الكسور', subject: 'الرياضيات', objectives: ['يميز الطالب الكسور المتساوية'] })

  it('استعلام فارغ يطابق الكل', () => {
    expect(matchesQuery(plan, '', ['title'])).toBe(true)
    expect(matchesQuery(plan, '   ', ['title'])).toBe(true)
  })

  it('مطابقة نصية بسيطة وغير حساسة لحالة الأحرف', () => {
    expect(matchesQuery(plan, 'كسور', ['title'])).toBe(true)
    expect(matchesQuery(plan, 'CASR'.toLowerCase(), ['title'])).toBe(false)
  })

  it('يبحث في المصفوفات (الأهداف) أيضًا', () => {
    expect(matchesQuery(plan, 'متساوية', ['objectives'])).toBe(true)
    expect(matchesQuery(plan, 'المشي', ['objectives'])).toBe(false)
  })

  it('على حقول متعددة يكفي أي تطابق', () => {
    expect(matchesQuery(plan, 'رياضيات', ['title', 'subject'])).toBe(true)
    expect(matchesQuery(plan, 'خطة', ['title', 'subject'])).toBe(true)
  })
})

describe('stripDemo', () => {
  it('يحذف المسجَّل بـ demo فقط', () => {
    const data = emptyData()
    data.plans = [
      makePlan({ id: 'user-plan', title: 'خطة المستخدم' }),
      makePlan({ id: 'demo-plan', demo: true, title: 'تجريبي' }),
    ]
    data.activities = [makeActivity({ id: 'demo-act', demo: true })]
    data.quizzes = [makeQuiz({ id: 'quiz-user' })]
    data.customCards = [makeCard({ id: 'demo-card', demo: true })]

    const clean = stripDemo(data)
    expect(clean.plans.map((p) => p.id)).toEqual(['user-plan'])
    expect(clean.activities).toHaveLength(0)
    expect(clean.quizzes.map((q) => q.id)).toEqual(['quiz-user'])
    expect(clean.customCards).toHaveLength(0)
  })

  it('لا يغير الملف الشخصي ولا الإصدار', () => {
    const data = emptyData()
    data.settings.profile.name = 'أحمد'
    data.version = 1
    const clean = stripDemo(data)
    expect(clean.settings.profile.name).toBe('أحمد')
    expect(clean.version).toBe(1)
  })
})

describe('mergeData', () => {
  it('العنصر الأحدث فوزًا عند نفس المعرف', () => {
    const local = emptyData()
    local.plans = [makePlan({ id: 'p1', title: 'قديمة محلية', updatedAt: 100 })]
    const incoming = emptyData()
    incoming.plans = [makePlan({ id: 'p1', title: 'جديدة واردة', updatedAt: 200 })]

    const merged = mergeData(local, incoming)
    expect(merged.plans).toHaveLength(1)
    expect(merged.plans[0]!.title).toBe('جديدة واردة')

    // بترتيب معكوس: الأحدث المحلية تبقى
    const merged2 = mergeData(incoming, local)
    expect(merged2.plans[0]!.title).toBe('جديدة واردة')
  })

  it('اتحاد المعرّفات من الطرفين وفرز بالأحدث', () => {
    const local = emptyData()
    local.plans = [makePlan({ id: 'a', updatedAt: 500 }), makePlan({ id: 'b', updatedAt: 100 })]
    const incoming = emptyData()
    incoming.plans = [makePlan({ id: 'c', updatedAt: 300 })]

    const merged = mergeData(local, incoming)
    expect(merged.plans.map((p) => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('الملف الشخصي المحلي غير الفارغ يُحفظ، والفارغ يقبل الوارد', () => {
    const local = emptyData()
    local.settings.profile = { name: 'معلم', school: 'مدرستي', semester: 'نص٢' }
    const incoming = emptyData()
    incoming.settings.profile = { name: '', school: '', semester: '' }

    expect(mergeData(local, incoming).settings.profile.name).toBe('معلم')

    const localEmpty = emptyData()
    const incomingWithProfile = emptyData()
    incomingWithProfile.settings.profile = { name: 'وارد', school: 'م', semester: 'س' }
    expect(mergeData(localEmpty, incomingWithProfile).settings.profile.name).toBe('وارد')
  })

  it('يتحمل بيانات واردة ناقصة (مصفوفات مفقودة)', () => {
    const local = emptyData()
    local.plans = [makePlan({ id: 'a', updatedAt: 1 })]
    const merged = mergeData(local, { ...emptyData(), plans: undefined as never })
    expect(merged.plans.map((p) => p.id)).toEqual(['a'])
  })
})

describe('backupFileName', () => {
  it('بالصيغة الموحدة مع التاريخ والساعة', () => {
    const name = backupFileName(new Date(2026, 2, 8, 9, 5).getTime())
    expect(name).toBe('moallem-plus-backup-20260308-0905.json')
  })

  it('الحشو بالصفر للحقل المفرد', () => {
    const name = backupFileName(new Date(2025, 0, 2, 3, 4).getTime())
    expect(name).toContain('20250102-0304')
  })
})
