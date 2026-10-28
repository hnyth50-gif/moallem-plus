import type {
  ActivityDoc,
  AppData,
  PlanDoc,
  QuizDoc,
} from './types'

// ============ عمليات المتجر (بدون أي اعتماد على React) ============
// دوال نقية يعاد استخدامها من DataContext ومن اختبارات الوحدة.

export function emptyData(): AppData {
  return {
    version: 1,
    savedAt: 0,
    plans: [],
    activities: [],
    quizzes: [],
    customCards: [],
    weekEntries: [],
    settings: { profile: { name: '', school: '', semester: '' } },
  }
}

export type Doc = PlanDoc | ActivityDoc | QuizDoc

export function upsertIn<T extends { id: string }>(list: T[], doc: T): T[] {
  const idx = list.findIndex((d) => d.id === doc.id)
  if (idx === -1) return [doc, ...list]
  const next = [...list]
  next[idx] = doc
  return next
}

export function removeFrom<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((d) => d.id !== id)
}

export function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((d) => d.id === id)
}

/** فرز بالتحديث الأحدث أولًا */
export function sortByUpdated<T extends { updatedAt: number; title?: string }>(list: T[], dir: 'asc' | 'desc' = 'desc'): T[] {
  const s = [...list].sort((a, b) =>
    dir === 'desc' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt,
  )
  return s
}

export function sortAlphabetically<T extends { title: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ar'))
}

/** بحث عربي بسيط غير حساس لحالة الأحرف على حقول معينة */
export function matchesQuery<T>(item: T, query: string, fields: (keyof T)[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((f) => {
    const v = item[f]
    if (typeof v === 'string') return v.toLowerCase().includes(q)
    if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && x.toLowerCase().includes(q))
    return false
  })
}

/** حذف كل العناصر التجريبية (demo: true) من جميع المجموعات */
export function stripDemo(data: AppData): AppData {
  return {
    ...data,
    plans: data.plans.filter((d) => !d.demo),
    activities: data.activities.filter((d) => !d.demo),
    quizzes: data.quizzes.filter((d) => !d.demo),
    customCards: data.customCards.filter((d) => !d.demo),
    weekEntries: (data.weekEntries ?? []).filter((d) => !d.demo),
  }
}

/** دمج نسختين حسب المعرّفات: الأحدث فوزًا، والإعدادات من الجهاز الحالي إن كانت مستغلّة */
export function mergeData(local: AppData, incoming: AppData): AppData {
  const pick = <T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>()
    for (const item of [...a, ...b]) {
      const existing = map.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt) map.set(item.id, item)
    }
    return [...map.values()].sort((x, y) => y.updatedAt - x.updatedAt)
  }
  const localProfile = local.settings?.profile
  const useLocalProfile =
    !!localProfile && (!!localProfile.name || !!localProfile.school || !!localProfile.semester)
  return {
    version: 1,
    savedAt: Date.now(),
    plans: pick(local.plans ?? [], incoming.plans ?? []),
    activities: pick(local.activities ?? [], incoming.activities ?? []),
    quizzes: pick(local.quizzes ?? [], incoming.quizzes ?? []),
    customCards: pick(local.customCards ?? [], incoming.customCards ?? []),
    weekEntries: pick(local.weekEntries ?? [], incoming.weekEntries ?? []),
    settings: useLocalProfile
      ? local.settings
      : incoming.settings ?? local.settings ?? { profile: { name: '', school: '', semester: '' } },
  }
}

/** اسم ملف النسخة الاحتياطية */
export function backupFileName(now = Date.now()): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `moallem-plus-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

export function downloadJson(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
