// ============ ألوان الموقع القابلة للتبديل ============
// كل لون (Accent) يعرّف متغيرات CSS بصيغة "r g b" تُحقن على عنصر <html>،
// وتقرأها Tailwind عبر rgb(var(--brand-N) / <alpha-value>) — فيتبدل لون الواجهة كلها فورًا،
// مع بقاء عمل تعديلات الشفافية (مثل bg-brand-900/40) سليمًا.

import { ACCENT_KEY, ACCENT_VARS_KEY } from './storage'

export interface Accent {
  id: string
  label: string
  /** hex أساسي (يُستخدم لميتا theme-color وللمعاينة) */
  hex: string
  /** لون المعاينة الدائري في الإعدادات */
  swatch: string
  /** متغيرات --brand-N بقيم "r g b" */
  vars: Record<string, string>
}

/** تحويل hex إلى نص "r g b" للاستخدام في المتغيرات */
function rgb(hex: string): string {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

function buildShades(shades: Record<string, string>): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [shade, hex] of Object.entries(shades)) vars[`--brand-${shade}`] = rgb(hex)
  return vars
}

// لوحات مستمدة من مقاييس Tailwind القياسية (الافتراضي = teal الحالي تمامًا)
const SHADES: Record<string, Record<string, string>> = {
  teal: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
    500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e',
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
  },
}

const LABELS: Record<string, string> = {
  teal: 'فيروزي',
  blue: 'أزرق',
  violet: 'بنفسجي',
  rose: 'وردي',
  amber: 'كهرماني',
  emerald: 'أخضر',
}

export const ACCENTS: Accent[] = Object.entries(SHADES).map(([id, shades]) => ({
  id,
  label: LABELS[id] ?? id,
  hex: shades[600],
  swatch: shades[500],
  vars: buildShades(shades),
}))

export const DEFAULT_ACCENT = ACCENTS[0]

export function accentById(id: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? DEFAULT_ACCENT
}

/** حقن متغيرات اللون على <html> وتحديث theme-color للمتصفح */
export function applyAccent(accent: Accent): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(accent.vars)) {
    root.style.setProperty(name, value)
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', accent.hex)
}

/** استرجاع اللون المحفوظ وتطبيقه (يُستدعى عند إقلاع التطبيق — آمنة التكرار) */
export function restoreAccent(): Accent {
  let accent = DEFAULT_ACCENT
  try {
    const saved = localStorage.getItem(ACCENT_KEY)
    if (saved) accent = accentById(saved)
  } catch {
    // تجاهل: قيود التخزين أو خصوصية المتصفح
  }
  applyAccent(accent)
  return accent
}

export function saveAccent(accent: Accent): void {
  try {
    localStorage.setItem(ACCENT_KEY, accent.id)
    // تُقرأ من سكربت الإقلاع في index.html لمنع وميض اللون الافتراضي قبل رسم الصفحة
    localStorage.setItem(ACCENT_VARS_KEY, JSON.stringify(accent.vars))
  } catch {
    // تجاهل
  }
}
