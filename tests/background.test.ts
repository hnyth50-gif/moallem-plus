import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKGROUND_KEY,
  DEFAULT_BACKGROUND,
  applyBackground,
  normalizeBackground,
  restoreBackground,
  saveBackground,
} from '../src/lib/background'

describe('إعدادات خلفية معلّم بلس', () => {
  beforeEach(() => {
    window.localStorage.removeItem(BACKGROUND_KEY)
    document.documentElement.removeAttribute('data-background')
  })

  it('تبدأ بخلفية تعليمية متوازنة', () => {
    expect(normalizeBackground(null)).toEqual(DEFAULT_BACKGROUND)
    expect(restoreBackground()).toEqual(DEFAULT_BACKGROUND)
    expect(document.documentElement.dataset.background).toBe('education')
  })

  it('تحفظ الاختيار والشدة ثم تستعيدهما', () => {
    saveBackground({ pattern: 'concept', intensity: 25 })
    expect(restoreBackground()).toEqual({ pattern: 'concept', intensity: 25 })
    expect(document.documentElement.style.getPropertyValue('--background-opacity')).toBe('0.25')
  })

  it('تمنع القيم غير الصحيحة وتقيّد الشدة', () => {
    expect(normalizeBackground({ pattern: 'unknown', intensity: 200 })).toEqual({ pattern: 'education', intensity: 35 })
    expect(normalizeBackground({ pattern: 'none', intensity: NaN })).toEqual({ pattern: 'none', intensity: 15 })
    expect(normalizeBackground({ pattern: 'notebook', intensity: -10 })).toEqual({ pattern: 'notebook', intensity: 0 })
  })

  it('تعالج الإعدادات المخزنة التالفة', () => {
    window.localStorage.setItem(BACKGROUND_KEY, '{invalid')
    expect(restoreBackground()).toEqual(DEFAULT_BACKGROUND)
  })

  it('تعدل العرض دون تغيير ألوان الهوية', () => {
    applyBackground({ pattern: 'notebook', intensity: 10 })
    expect(document.documentElement.dataset.background).toBe('notebook')
    expect(document.documentElement.style.getPropertyValue('--background-opacity-dark')).toBe('0.075')
  })
})
