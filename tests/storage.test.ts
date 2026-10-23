// ============ اختبارات طبقة التخزين المحلي (storage.ts) ============

import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  THEME_KEY,
  loadAppState,
  saveAppState,
  clearAppState,
  estimateKb,
  SAVE_ERROR_MESSAGES,
} from '../src/lib/storage'
import { emptyData } from '../src/lib/store'
import { makePlan } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
})

describe('حفظ وتحميل البيانات', () => {
  it('التحميل من مخزن فارغ يعيد null', () => {
    expect(loadAppState()).toBeNull()
  })

  it('حفظ ثم تحميل = نسخة مطابقة (round-trip)', () => {
    const data = emptyData()
    data.savedAt = 1234
    data.plans = [makePlan()]
    data.settings.profile.name = 'أبو عبدالله'

    const saved = saveAppState(data)
    expect(saved).toEqual({ ok: true })

    const loaded = loadAppState()
    expect(loaded).not.toBeNull()
    expect(loaded!.savedAt).toBe(1234)
    expect(loaded!.plans).toHaveLength(1)
    expect(loaded!.plans[0]!.title).toBe(data.plans[0]!.title)
    expect(loaded!.settings.profile.name).toBe('أبو عبدالله')
  })

  it('يُحرَّف المفتاح الصحيح في المتصفح', () => {
    saveAppState(emptyData())
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(THEME_KEY).toBe('moallem-plus:theme')
  })

  it('بيانات تالفة (JSON غير صالح) تعيد null بلا خطأ', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ليس json::')
    expect(loadAppState()).toBeNull()
  })

  it('قيم غير كائنية (أرقام/سلاسل) تعيد null', () => {
    window.localStorage.setItem(STORAGE_KEY, '42')
    expect(loadAppState()).toBeNull()
    window.localStorage.setItem(STORAGE_KEY, '"نص فقط"')
    expect(loadAppState()).toBeNull()
  })

  it('قيمة null صريحة تعيد null', () => {
    window.localStorage.setItem(STORAGE_KEY, 'null')
    expect(loadAppState()).toBeNull()
  })
})

describe('clearAppState', () => {
  it('يزيل المفتاح ويقفل الباب على null', () => {
    saveAppState(emptyData())
    clearAppState()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(loadAppState()).toBeNull()
  })

  it('مسح مفتاح غير موجود لا يرمي خطأ', () => {
    expect(() => clearAppState()).not.toThrow()
  })
})

describe('SAVE_ERROR_MESSAGES', () => {
  it('رسائل عربية لكل أسباب الفشل', () => {
    expect(SAVE_ERROR_MESSAGES.quota).toContain('مساحة التخزين المحلي ممتلئة')
    expect(SAVE_ERROR_MESSAGES.unavailable).toContain('وضع خاص')
  })
})

describe('estimateKb', () => {
  it('يتناسب مع حجم البيانات (الفراغ قريب من الصفر والامتلاء أكبر)', () => {
    const small = estimateKb(emptyData()) // بيانات فارغة: حجمها يتقرب للصفر
    const data = emptyData()
    data.plans = Array.from({ length: 50 }, (_, i) => makePlan({ id: `plan-big-${i}` }))
    const big = estimateKb(data)
    expect(big).toBeGreaterThan(0)
    expect(big).toBeGreaterThan(small)
  })
})
