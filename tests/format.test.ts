// ============ اختبارات أدوات التنسيق العربية ============

import { describe, it, expect } from 'vitest'
import { formatPoints, pointsLabel, arabicIndex, formatRelative } from '../src/lib/format'

describe('formatPoints', () => {
  it('يحول الأرقام إلى الأرقام العربية الشرقية', () => {
    // ar-EG يعطي الأرقام الهندية (٠١٢...)
    expect(formatPoints(10)).toContain('١')
    expect(formatPoints(15)).toContain('٥')
  })

  it('يتحمل القيم غير النهائية', () => {
    expect(typeof formatPoints(Number.NaN)).toBe('string')
  })
})

describe('pointsLabel', () => {
  it('نقطة واحدة / نقطتان', () => {
    expect(pointsLabel(1)).toBe('نقطة واحدة')
    expect(pointsLabel(2)).toBe('نقطتان')
  })

  it('٣ إلى ١٠ بالجمع', () => {
    expect(pointsLabel(5)).toContain('نقاط')
    expect(pointsLabel(10)).toContain('نقاط')
  })

  it('١١ فصاعدًا بالمفرد', () => {
    expect(pointsLabel(11)).toContain('نقطة')
    expect(pointsLabel(11)).not.toContain('نقاط')
    expect(pointsLabel(14)).toContain('نقطة')
    expect(pointsLabel(100)).toContain('نقطة')
  })

  it('الصفر بلا نقاط لا ينكسر', () => {
    const out = pointsLabel(0)
    expect(out).toContain('٠')
  })

  it('القيمة غير الرقمية تعسل فارغًا (لا تظهر نقاطًا وهمية)', () => {
    expect(pointsLabel(Number.NaN)).toBe('')
    expect(pointsLabel(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('arabicIndex', () => {
  it('الفهرس يبدأ من الواحد', () => {
    expect(arabicIndex(0)).toContain('١')
    expect(arabicIndex(4)).toContain('٥')
  })
})

describe('formatRelative', () => {
  it('قيم الماضي تعود بعبارات عربية', () => {
    const now = new Date(2026, 9, 23, 12, 0).getTime()
    expect(formatRelative(now - 30_000, now)).toBe('قبل لحظات')
    expect(formatRelative(now - 2 * 60_000, now)).toContain('دق')
    expect(formatRelative(now - 3 * 3_600_000, now)).toContain('سا')
    // numeric:'auto' يعطي «أول أمس» لتقريب يومين، وإلا «قبل يوم/يومين»
    const twoDays = formatRelative(now - 2 * 86_400_000, now)
    expect(twoDays === 'أول أمس' || twoDays.includes('يوم')).toBe(true)
  })

  it('قيمة غير رقمية تعلن فارغًا', () => {
    expect(formatRelative(Number.NaN)).toBe('')
  })
})
