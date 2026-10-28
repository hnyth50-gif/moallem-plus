// خلفيات معلّم بلس: تُحفظ مستقلة عن المستندات، وتتبع ألوان الهوية الحالية.
export const BACKGROUND_KEY = 'moallem-plus:background'

export type BackgroundPattern = 'education' | 'concept' | 'notebook' | 'none'

export interface BackgroundSettings {
  pattern: BackgroundPattern
  intensity: number
}

export const DEFAULT_BACKGROUND: BackgroundSettings = { pattern: 'education', intensity: 15 }

export const BACKGROUND_OPTIONS: ReadonlyArray<{
  id: BackgroundPattern
  label: string
  description: string
}> = [
  { id: 'education', label: 'رموز تعليمية', description: 'كتب وأقلام وأدوات التدريس' },
  { id: 'concept', label: 'خريطة مفاهيم', description: 'مسارات وروابط بين الأفكار' },
  { id: 'notebook', label: 'دفتر التحضير', description: 'خطوط وتفاصيل دفتر المعلم' },
  { id: 'none', label: 'بدون زخارف', description: 'خلفية بسيطة للتركيز' },
]

/** لا نثق بالقيم المخزنة في المتصفح أو المستوردة من خارج التطبيق. */
export function normalizeBackground(raw: unknown): BackgroundSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BACKGROUND }
  const value = raw as Record<string, unknown>
  const pattern = BACKGROUND_OPTIONS.some((item) => item.id === value.pattern)
    ? value.pattern as BackgroundPattern
    : DEFAULT_BACKGROUND.pattern
  const n = typeof value.intensity === 'number' ? value.intensity : DEFAULT_BACKGROUND.intensity
  const intensity = Number.isFinite(n) ? Math.min(35, Math.max(0, Math.round(n / 5) * 5)) : DEFAULT_BACKGROUND.intensity
  return { pattern, intensity }
}

export function applyBackground(raw: BackgroundSettings): void {
  const settings = normalizeBackground(raw)
  const root = document.documentElement
  root.dataset.background = settings.pattern
  root.style.setProperty('--background-opacity', String(settings.intensity / 100))
  root.style.setProperty('--background-opacity-dark', String(settings.intensity / 100 * 0.75))
}

export function restoreBackground(): BackgroundSettings {
  let settings = { ...DEFAULT_BACKGROUND }
  try {
    const raw = window.localStorage.getItem(BACKGROUND_KEY)
    if (raw) settings = normalizeBackground(JSON.parse(raw))
  } catch {
    // إعدادات اختيارية؛ يمكن أن يمنع المتصفح التخزين المحلي.
  }
  applyBackground(settings)
  return settings
}

export function saveBackground(raw: BackgroundSettings): void {
  try {
    window.localStorage.setItem(BACKGROUND_KEY, JSON.stringify(normalizeBackground(raw)))
  } catch {
    // يظل التغيير مرئيًا في الجلسة الحالية إن تعذّر الحفظ.
  }
}
