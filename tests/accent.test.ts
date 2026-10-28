// ============ اختبارات ألوان الموقع القابلة للتبديل ============

import { describe, it, expect, beforeEach } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT, accentById, applyAccent, restoreAccent, saveAccent } from '../src/lib/accent'
import { ACCENT_KEY, ACCENT_VARS_KEY } from '../src/lib/storage'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('style')
})

describe('لوحات الألوان', () => {
  it('ستة ألوان معرفّة بعناوين عربية ومتغيرات كاملة 50-950', () => {
    expect(ACCENTS.length).toBe(6)
    for (const a of ACCENTS) {
      expect(a.label.length).toBeGreaterThan(0)
      for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
        expect(a.vars[`--brand-${shade}`]).toMatch(/^\d+ \d+ \d+$/)
      }
    }
  })

  it('الافتراضي هو الفيروزي المطابق للهوية الأصلية', () => {
    expect(DEFAULT_ACCENT.id).toBe('teal')
    expect(DEFAULT_ACCENT.vars['--brand-700']).toBe('15 118 110') // #0f766e
  })

  it('accentById يرجع الافتراضي للمعرّفات المجهولة', () => {
    expect(accentById('blue').id).toBe('blue')
    expect(accentById('غير موجود')).toBe(DEFAULT_ACCENT)
    expect(accentById(null)).toBe(DEFAULT_ACCENT)
  })
})

describe('الحقن والحفظ والاسترجاع', () => {
  it('applyAccent يحقن متغيرات CSS على <html> ويحدث theme-color', () => {
    const blue = accentById('blue')
    applyAccent(blue)
    expect(document.documentElement.style.getPropertyValue('--brand-600')).toBe('37 99 235')
    // meta theme-color (يوجد في index.html الحقيقي؛ ننشئه في الاختبار لنتحقق)
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
    applyAccent(blue)
    expect(meta.getAttribute('content')).toBe(blue.hex)
    meta.remove()
  })

  it('saveAccent يحفظ المعرّف والمتغيرات، وrestoreAccent يسترجعهما', () => {
    const rose = accentById('rose')
    saveAccent(rose)
    expect(localStorage.getItem(ACCENT_KEY)).toBe('rose')
    expect(JSON.parse(localStorage.getItem(ACCENT_VARS_KEY) ?? '{}')['--brand-600']).toBe('225 29 72')

    // محاكاة إقلاع جديد: صفحة نظيفة ثم استرجاع
    document.documentElement.removeAttribute('style')
    const restored = restoreAccent()
    expect(restored.id).toBe('rose')
    expect(document.documentElement.style.getPropertyValue('--brand-600')).toBe('225 29 72')
  })

  it('restoreAccent بلا حفظ يعيد الافتراضي ويعيد ضبط المتغيرات', () => {
    localStorage.setItem(ACCENT_KEY, 'مجهول')
    const restored = restoreAccent()
    expect(restored).toBe(DEFAULT_ACCENT)
    expect(document.documentElement.style.getPropertyValue('--brand-700')).toBe('15 118 110')
  })
})
