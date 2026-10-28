// ============ اختبارات أدوات التنسيق العربية ============

import { describe, it, expect } from 'vitest'
import { formatPoints, pointsLabel, arabicIndex, formatRelative, formatHijri, formatTime, formatDate, formatDateForPrint } from '../src/lib/format'

describe('formatPoints', () => {
  it('يعرض الأرقام الغربية في جميع الأعداد', () => {
    expect(formatPoints(10)).toBe('10')
    expect(formatPoints(15)).toBe('15')
    expect(formatPoints(12345)).toBe('12,345')
    expect(formatPoints(12.5)).toBe('12.5')
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

  it('3 إلى 10 بالجمع', () => {
    expect(pointsLabel(5)).toContain('نقاط')
    expect(pointsLabel(10)).toContain('نقاط')
  })

  it('11 فصاعدًا بالمفرد', () => {
    expect(pointsLabel(11)).toContain('نقطة')
    expect(pointsLabel(11)).not.toContain('نقاط')
    expect(pointsLabel(14)).toContain('نقطة')
    expect(pointsLabel(100)).toContain('نقطة')
  })

  it('الصفر بلا نقاط لا ينكسر', () => {
    const out = pointsLabel(0)
    expect(out).toContain('0')
  })

  it('القيمة غير الرقمية تعسل فارغًا (لا تظهر نقاطًا وهمية)', () => {
    expect(pointsLabel(Number.NaN)).toBe('')
    expect(pointsLabel(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('arabicIndex', () => {
  it('الفهرس يبدأ من الواحد', () => {
    expect(arabicIndex(0)).toBe('1')
    expect(arabicIndex(4)).toBe('5')
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

describe('formatHijri', () => {
  it('يعيد تاريخًا هجريًا منتهيًا بـ«هـ»', () => {
    const t = new Date(2026, 9, 23, 12, 0).getTime()
    const out = formatHijri(t)
    expect(out).toContain('هـ')
    expect(out.length).toBeGreaterThan(3)
  })

  it('قيم غير صالحة تعلن فارغًا', () => {
    expect(formatHijri(0)).toBe('')
    expect(formatHijri(Number.NaN)).toBe('')
    expect(formatHijri(null)).toBe('')
  })
})

describe('formatTime', () => {
  it('يعرض الوقت بنظام 24 ساعة', () => {
    const t = new Date(2026, 0, 1, 9, 5, 3).getTime()
    expect(formatTime(t)).toBe('09:05:03')
  })

  it('قيم غير صالحة تعلن فارغًا', () => {
    expect(formatTime(null)).toBe('')
    expect(formatTime(Number.NaN)).toBe('')
  })
})

describe('توحيد نظام الأرقام في جميع التواريخ والنصوص', () => {
  const easternDigits = /[٠-٩۰-۹]/
  const sampleDate = new Date(2026, 9, 23, 9, 5, 3).getTime()

  it('يحافظ على أسماء الأشهر العربية مع الأرقام الغربية', () => {
    const date = formatDate(sampleDate)
    expect(date).toContain('2026')
    expect(date).toContain('23')
    expect(date).not.toMatch(easternDigits)

    const printedDate = formatDateForPrint('2026-10-23')
    expect(printedDate).toContain('2026')
    expect(printedDate).not.toMatch(easternDigits)
  })

  it('يستخدم الأرقام الغربية في التاريخ الهجري والزمن النسبي', () => {
    const hijri = formatHijri(sampleDate)
    expect(hijri).toContain('هـ')
    expect(hijri).toMatch(/[0-9]/)
    expect(hijri).not.toMatch(easternDigits)

    const relative = formatRelative(sampleDate - 23 * 60_000, sampleDate)
    expect(relative).toContain('23')
    expect(relative).not.toMatch(easternDigits)
  })

  it('لا يعيد أرقامًا شرقية في النقاط أو الترقيم أو الساعة', () => {
    expect(formatPoints(1098)).not.toMatch(easternDigits)
    expect(pointsLabel(1098)).not.toMatch(easternDigits)
    expect(arabicIndex(7)).toBe('8')
    expect(formatTime(sampleDate)).not.toMatch(easternDigits)
  })
})
