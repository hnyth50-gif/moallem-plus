// ============ اختبارات محرك خطة الدرس ============

import { describe, it, expect } from 'vitest'
import {
  distributeMinutes,
  sectionsFromTemplate,
  PLAN_PHASES,
  PHASE_TEMPLATES,
  SUBJECT_SUGGESTIONS,
  GRADE_SUGGESTIONS,
} from '../src/lib/planEngine'

describe('PLAN_PHASES / PHASE_TEMPLATES', () => {
  it('المراحل والأوزان متسقة: كل وزن بين 0 و1 ومجموعها ≤ 1', () => {
    const sum = PHASE_TEMPLATES.reduce((s, t) => s + t.weight, 0)
    expect(sum).toBeGreaterThan(0)
    expect(sum).toBeLessThanOrEqual(1.0001)
    for (const t of PHASE_TEMPLATES) {
      expect(PLAN_PHASES).toContain(t.phase)
      expect(t.weight).toBeGreaterThan(0)
      expect(t.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('distributeMinutes', () => {
  it.each([45, 40, 30, 55, 60, 300])('مجموع الدقائق يساوي تمامًا $0 للمدة', (total) => {
    const out = distributeMinutes(total)
    const sum = out.reduce((s, r) => s + r.minutes, 0)
    expect(sum).toBe(total)
    expect(out.every((r) => r.minutes >= 1)).toBe(true)
  })

  it.each([45, 40, 30, 55, 60, 300])('المراحل بترتيب القالب للمدة $0', (total) => {
    const out = distributeMinutes(total)
    const expected = PHASE_TEMPLATES.filter((t) => out.some((o) => o.phase === t.phase)).map((t) => t.phase)
    expect(out.map((o) => o.phase)).toEqual(expected)
  })

  it('أعلى وزن يأخذ أكبر زمن في حصة نموذجية (45 دقيقة)', () => {
    const out = distributeMinutes(45)
    const show = out.find((o) => o.phase === 'عرض وشرح')!
    const opening = out.find((o) => o.phase === 'افتتاحية وتهيئة')!
    expect(show.minutes).toBeGreaterThan(opening.minutes)
    // الشرح ≈ 40% من الزمن
    expect(show.minutes).toBeGreaterThanOrEqual(Math.floor(45 * 0.4) - 2)
    expect(show.minutes).toBeLessThanOrEqual(Math.floor(45 * 0.4) + 3)
  })

  it('حصة قصيرة جدًا (2 دقيقة) تحتفظ بأهم مرحلتين فقط بلا صفر', () => {
    const out = distributeMinutes(2)
    expect(out).toHaveLength(2)
    expect(out.reduce((s, r) => s + r.minutes, 0)).toBe(2)
    expect(out.every((r) => r.minutes >= 1)).toBe(true)
    // أعلى وزن أخضر «عرض وشرح» ضمن المختارة
    expect(out.map((o) => o.phase)).toContain('عرض وشرح')
  })

  it('دقيقة واحدة = مرحلة واحدة دقيقة', () => {
    const out = distributeMinutes(1)
    expect(out).toHaveLength(1)
    expect(out[0]!.minutes).toBe(1)
  })

  it('قيم زمنية شاذة تُعالج بأمان (صفر / سالب / غير رقمي)', () => {
    for (const bad of [0, -10, Number.NaN]) {
      const out = distributeMinutes(bad)
      expect(out.length).toBeGreaterThan(0)
      const sum = out.reduce((s, r) => s + r.minutes, 0)
      expect(sum).toBe(Number.isNaN(bad) ? 45 : 1)
    }
  })

  it('قائمة قوالب مخصصة تعمل كذلك', () => {
    const out = distributeMinutes(30, [
      { phase: 'مخصصة 1', weight: 0.5, hint: 'أ' },
      { phase: 'مخصصة 2', weight: 0.5, hint: 'ب' },
    ])
    expect(out.map((o) => o.phase)).toEqual(['مخصصة 1', 'مخصصة 2'])
    expect(out.reduce((s, r) => s + r.minutes, 0)).toBe(30)
  })
})

describe('sectionsFromTemplate', () => {
  it('يبني أقسام خطة جاهزة بمجموع يطابق المدة', () => {
    const sections = sectionsFromTemplate(45)
    expect(sections).toHaveLength(PHASE_TEMPLATES.length)
    expect(sections.reduce((s, r) => s + r.minutes, 0)).toBe(45)
    for (const s of sections) {
      expect(s.phase.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
    }
  })

  it('مدد مختلفة تعطي مجموعات متطابقة معروفة في الخطة', () => {
    for (const total of [10, 25, 50, 90]) {
      const s = sectionsFromTemplate(total)
      expect(s.reduce((acc, x) => acc + x.minutes, 0)).toBe(total)
    }
  })
})

describe('اقتراحات البحث', () => {
  it('قوائم اقتراح المواد والصفوف غير فارغة', () => {
    expect(SUBJECT_SUGGESTIONS.length).toBeGreaterThan(5)
    expect(GRADE_SUGGESTIONS.length).toBeGreaterThan(8)
    expect(new Set(GRADE_SUGGESTIONS).size).toBe(GRADE_SUGGESTIONS.length)
  })
})
