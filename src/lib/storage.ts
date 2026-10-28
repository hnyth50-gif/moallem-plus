import type { AppData } from './types'

// ============ طبقة التخزين المحلي ============
// تغليف آمن لـ localStorage: تحليل محمي، فشل صامت لكن مُبلَّغ، وبدون أي انفجارات.

export const STORAGE_KEY = 'moallem-plus:v1'
export const THEME_KEY = 'moallem-plus:theme'
export const ACCENT_KEY = 'moallem-plus:accent'
export const ACCENT_VARS_KEY = 'moallem-plus:accent-vars'
export const INSTALL_PROMPT_KEY = 'moallem-plus:install-prompt'

export interface SaveResult {
  ok: boolean
  reason?: 'quota' | 'unavailable'
}

export function loadAppState(): AppData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as AppData
  } catch {
    return null
  }
}

export function saveAppState(data: AppData): SaveResult {
  try {
    if (!window.localStorage) return { ok: false, reason: 'unavailable' }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    const name = (e as { name?: string } | null)?.name ?? ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, reason: 'quota' }
    }
    return { ok: false, reason: 'unavailable' }
  }
}

export function clearAppState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* تجاهل */
  }
}

export const SAVE_ERROR_MESSAGES: Record<NonNullable<SaveResult['reason']>, string> = {
  quota: 'مساحة التخزين المحلي ممتلئة — احرص على تصدير نسخة احتياطية ثم أزل بيانات قديمة.',
  unavailable: 'المتصفح يمنع الحفظ المحلي (وضع خاص؟) — البيانات لن تُحفظ عند الإغلاق. نزّل نسخة احتياطية.',
}

/** حجم البيانات بالكيلوبايت تقريبًا (مؤشر معلوماتي فقط) */
export function estimateKb(data: AppData): number {
  try {
    return Math.round(JSON.stringify(data).length / 1024)
  } catch {
    return 0
  }
}
