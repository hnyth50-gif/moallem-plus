// ============ اختبارات مكتبة بطاقات التفكير (strategies.ts) ============

import { describe, it, expect } from 'vitest'
import { BUILTIN_CARDS, BUILTIN_COUNT, CATEGORY_LABELS, CATEGORY_COLORS, cardOfDay } from '../src/lib/strategies'
import { CARD_CATEGORIES } from '../src/lib/types'

// عدد البطاقات الفعلي في المكتبة — يُعاد حسابه من المصدر لا تفترضه
const CARD_COUNT = BUILTIN_CARDS.length

describe('المكتبة الجاهزة', () => {
  it('BUILTIN_COUNT مطابق لطول المصفوفة الفعلي', () => {
    expect(BUILTIN_COUNT).toBe(CARD_COUNT)
  })

  it('مكتبة معقولة الحجم (24 بطاقة على الأقل، لا فوّاريات)', () => {
    expect(CARD_COUNT).toBeGreaterThanOrEqual(24)
  })

  it('معرّفات builtin-01 فصاعدًا تسلسلية وفريدة', () => {
    const ids = BUILTIN_CARDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(CARD_COUNT)
    for (let i = 1; i <= CARD_COUNT; i++) {
      expect(ids).toContain(`builtin-${String(i).padStart(2, '0')}`)
    }
  })

  it('كل بطاقة مكتملة الحقول (عنوان/تعريف/خطوات/نصائح)', () => {
    for (const c of BUILTIN_CARDS) {
      expect(c.builtin).toBe(true)
      expect(c.title.trim().length).toBeGreaterThan(0)
      expect(c.brief.trim().length).toBeGreaterThan(2)
      expect(c.steps.length).toBeGreaterThanOrEqual(2)
      expect(c.steps.every((s) => s.trim().length > 0)).toBe(true)
      expect(c.timing.trim()).not.toBe('')
      expect(c.suitableFor.trim()).not.toBe('')
      expect(c.tips.trim()).not.toBe('')
      expect(c.updatedAt).toBe(0)
    }
  })

  it('جميع التصنيفات الستة مغطاة بعناصر، ولا تصنيف خارج القائمة', () => {
    const categories = new Set(BUILTIN_CARDS.map((c) => c.category))
    expect([...categories].sort()).toEqual([...CARD_CATEGORIES].sort())
  })
})

describe('تسميات وألوان التصنيفات', () => {
  it('كل التصنيفات لها تسمية عربية وفئة ألوان tailwind سليمة', () => {
    for (const key of CARD_CATEGORIES) {
      expect(CATEGORY_LABELS[key].trim().length).toBeGreaterThan(0)
      // الألوان فئات tailwind (bg-.../text-...) لا أكواد hex
      expect(typeof CATEGORY_COLORS[key]).toBe('string')
      expect(CATEGORY_COLORS[key].length).toBeGreaterThan(0)
      expect(CATEGORY_COLORS[key]).toContain('bg-')
    }
  })
})

describe('cardOfDay', () => {
  it('حتمي: نفس اليوم يعطي نفس البطاقة', () => {
    const a = cardOfDay(BUILTIN_CARDS, '2026-10-23')
    const b = cardOfDay(BUILTIN_CARDS, '2026-10-23')
    expect(a?.id).toBe(b?.id)
  })

  it('الناتج دومًا ضمن المكتبة', () => {
    for (const day of ['2026-01-01', '2026-06-15', '2026-12-31', '']) {
      const card = cardOfDay(BUILTIN_CARDS, day)
      expect(card).toBeDefined()
      expect(BUILTIN_CARDS.find((c) => c.id === card!.id)).toBeDefined()
    }
  })

  it('قائمة فارغة تعيد undefined', () => {
    expect(cardOfDay([], '2026-10-23')).toBeUndefined()
  })

  it('أيام مختلفة توزع الاختيار (توازن معقول وليس بطاقة واحدة دائمًا)', () => {
    const picked = new Set<string>()
    for (let d = 1; d <= 30; d++) {
      const t = cardOfDay(BUILTIN_CARDS, `2026-02-${String(d).padStart(2, '0')}`)
      if (t) picked.add(t.id)
    }
    expect(picked.size).toBeGreaterThan(5)
  })
})
