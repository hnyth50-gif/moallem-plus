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

/** يحفظ كل حساب ذاكرته المحلية مستقلة عن بقية الحسابات. المفتاح القديم يبقى للضيف دون تغييره. */
export function scopedStorageKey(userId: string | null = null): string {
  return userId ? `${STORAGE_KEY}:user:${userId}` : STORAGE_KEY
}

export function loadAppState(userId: string | null = null): AppData | null {
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as AppData
  } catch {
    return null
  }
}

export function saveAppState(data: AppData, userId: string | null = null): SaveResult {
  try {
    if (!window.localStorage) return { ok: false, reason: 'unavailable' }
    window.localStorage.setItem(scopedStorageKey(userId), JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    const name = (e as { name?: string } | null)?.name ?? ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, reason: 'quota' }
    }
    return { ok: false, reason: 'unavailable' }
  }
}

export function clearAppState(userId: string | null = null): void {
  try {
    window.localStorage.removeItem(scopedStorageKey(userId))
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
