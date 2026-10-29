// ============ طبقة المزامنة السحابية مع Supabase ============
// جدول واحد «notes» يحفظ مستندات كل المستخدمين: كل صف = مستند واحد
// (خطة / نشاط / اختبار / بطاقة / مهمة أسبوعية / شهادة) أو صف الإعدادات.
// المحلي (localStorage) يظل طبقة العمل دون اتصال، والسحابة مصدر الحقيقة عند تسجيل الدخول:
// - الجلب: pullAll ثم دمج بالأحدث (updatedAt) في DataContext.
// - الإضافة/التعديل: upsert دفعات مؤجلة من فرق التعديل.
// - الحذف: حذف بالمعرف والمستخدم.
// كل الدوال آمنة: بلا عميل أو بلا اتصال تعيد { ok:false, reason:'unavailable' } دون رمي أخطاء.

import type { AppData, CertificateDoc, PlanDoc, ActivityDoc, QuizDoc, ThinkingCard, WeekEntry } from './types'
import { getSupabaseClient } from './supabaseClient'
import type { SupabaseRow } from './supabaseTypes'
import { normalizeCloudRow, type CloudKind } from './validate'

export const NOTES_TABLE = 'notes'

export interface CloudRef {
  kind: CloudKind
  id: string
}

export interface CloudOp {
  kind: CloudKind
  doc: PlanDoc | ActivityDoc | QuizDoc | ThinkingCard | WeekEntry | CertificateDoc
}

export interface CloudDelete {
  kind: CloudKind
  id: string
}

export interface CloudResult {
  ok: boolean
  reason?: 'unavailable' | 'network' | 'auth'
}

/** اسم عمود kind في الجدول لكل مصفوفة في AppData */
export const KIND_BY_ARRAY: Record<keyof Omit<AppData, 'version' | 'savedAt' | 'settings'>, CloudKind> = {
  plans: 'plan',
  activities: 'activity',
  quizzes: 'quiz',
  customCards: 'card',
  weekEntries: 'week',
  certificates: 'certificate',
}

function docTitle(doc: CloudOp['doc']): string {
  const d = doc as { title?: string; studentName?: string }
  return d.title || d.studentName || ''
}

/** مستند محلي ← صف جدول */
export function toRow(kind: CloudKind, doc: CloudOp['doc'], userId: string): Record<string, unknown> {
  const stamps = doc as { createdAt?: number; updatedAt?: number }
  return {
    id: doc.id,
    user_id: userId,
    kind,
    title: docTitle(doc),
    data: doc,
    created_at: new Date(stamps.createdAt || Date.now()).toISOString(),
    updated_at: new Date(stamps.updatedAt || Date.now()).toISOString(),
  }
}

/** فرق التغيير بين نسختين من البيانات: ما أُضيف/عُدّل وما حُذف */
export function diffDocs(
  prev: Pick<AppData, 'plans' | 'activities' | 'quizzes' | 'customCards' | 'weekEntries' | 'certificates'>,
  next: Pick<AppData, 'plans' | 'activities' | 'quizzes' | 'customCards' | 'weekEntries' | 'certificates'>,
): { upserts: CloudOp[]; deletes: CloudDelete[] } {
  const upserts: CloudOp[] = []
  const deletes: CloudDelete[] = []
  for (const key of Object.keys(KIND_BY_ARRAY) as Array<keyof typeof KIND_BY_ARRAY>) {
    const kind = KIND_BY_ARRAY[key]
    const before = new Map<string, number>((prev[key] ?? []).map((d) => [d.id, d.updatedAt]))
    for (const doc of next[key] ?? []) {
      const beforeAt = before.get(doc.id)
      if (beforeAt === undefined || doc.updatedAt > beforeAt) {
        upserts.push({ kind, doc: doc as CloudOp['doc'] })
      }
      before.delete(doc.id)
    }
    for (const id of before.keys()) deletes.push({ kind, id })
  }
  return { upserts, deletes }
}

/** تطبيع صف كامل من الجدول إلى مستند سحابي — صف الإعدادات والمشوّه يُهملان بأمان */
export function normalizeRowDoc(row: { kind: string; data: unknown } | null | undefined): ReturnType<typeof normalizeCloudRow> {
  if (!row || typeof row !== 'object') return null
  if (row.kind === 'settings') return null
  return normalizeCloudRow(row.kind, row.data)
}

/** سحب كل مستندات المستخدم وإعادة تشكيلها كـ AppData جزئي */
export async function pullAll(userId: string): Promise<CloudResult & { data?: Partial<AppData>; profile?: AppData['settings']['profile'] }> {
  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: 'unavailable' }
  try {
    const res = await client.from(NOTES_TABLE).select('*').eq('user_id', userId)
    if (res.error) return { ok: false, reason: res.error.message.includes('JWT') ? 'auth' : 'network' }
    const rows = (res.data ?? []) as SupabaseRow[]
    const out: Partial<AppData> = {
      plans: [],
      activities: [],
      quizzes: [],
      customCards: [],
      weekEntries: [],
      certificates: [],
    }
    let profile: AppData['settings']['profile'] | undefined
    for (const row of rows) {
      if (row.kind === 'settings') {
        const data = row.data as { profile?: AppData['settings']['profile'] } | null
        if (data?.profile) profile = data.profile
        continue
      }
      const normalized = normalizeRowDoc(row)
      if (!normalized) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(out as Record<string, unknown[]>)[keyOfKind(normalized.kind)].push(normalized.doc as any)
    }
    return { ok: true, data: out, profile }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

function keyOfKind(kind: CloudKind): keyof typeof KIND_BY_ARRAY {
  const found = (Object.keys(KIND_BY_ARRAY) as Array<keyof typeof KIND_BY_ARRAY>).find((k) => KIND_BY_ARRAY[k] === kind)
  return found ?? 'plans'
}

/** رفع دفعة مستندات (إضافة/تعديل) */
export async function pushUpserts(ops: CloudOp[], userId: string): Promise<CloudResult> {
  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: 'unavailable' }
  if (ops.length === 0) return { ok: true }
  try {
    const rows = ops.map((op) => toRow(op.kind, op.doc, userId))
    const res = await client.from(NOTES_TABLE).upsert(rows, { onConflict: 'id' })
    if (res.error) return { ok: false, reason: res.error.message.includes('JWT') ? 'auth' : 'network' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** حذف دفعة مستندات بالمعرفات (لكل أنواعها — المعرف فريد لكل مستخدم) */
export async function pushDeletes(deletes: CloudDelete[], userId: string): Promise<CloudResult> {
  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: 'unavailable' }
  if (deletes.length === 0) return { ok: true }
  try {
    const res = await client.from(NOTES_TABLE).delete().eq('user_id', userId).in('id', deletes.map((d) => d.id))
    if (res.error) return { ok: false, reason: res.error.message.includes('JWT') ? 'auth' : 'network' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** رفع ملف المستخدم الشخصي (صف الإعدادات) */
export async function pushProfile(
  profile: AppData['settings']['profile'],
  userId: string,
): Promise<CloudResult> {
  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: 'unavailable' }
  try {
    const now = new Date().toISOString()
    const res = await client.from(NOTES_TABLE).upsert(
      [
        {
          id: 'settings',
          user_id: userId,
          kind: 'settings',
          title: 'الإعدادات',
          data: { profile },
          created_at: now,
          updated_at: now,
        },
      ],
      { onConflict: 'id' },
    )
    if (res.error) return { ok: false, reason: res.error.message.includes('JWT') ? 'auth' : 'network' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

// ============ قائمة الدفع المؤجلة (تعمل دون اتصال وتُكرر عند العودة) ============

let queueOps: CloudOp[] = []
let queueDeletes: CloudDelete[] = []
let queueProfile: AppData['settings']['profile'] | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let onFlushResult: ((ok: boolean) => void) | null = null

/** تسجيل مستمع لنتيجة كل دفعة (لحالة المزامنة في الواجهة) */
export function setFlushListener(listener: ((ok: boolean) => void) | null): void {
  onFlushResult = listener
}

function enqueue(ops: CloudOp[], deletes: CloudDelete[], profile: AppData['settings']['profile'] | null): void {
  queueOps = mergeOps(queueOps, ops)
  const deleteIds = new Set(deletes.map((d) => `${d.kind}:${d.id}`))
  queueOps = queueOps.filter((op) => !deleteIds.has(`${op.kind}:${op.doc.id}`))
  queueDeletes = [...queueDeletes, ...deletes]
  const deletedSet = new Set(queueDeletes.map((d) => `${d.kind}:${d.id}`))
  queueOps = queueOps.filter((op) => !deletedSet.has(`${op.kind}:${op.doc.id}`))
  if (profile) queueProfile = profile
  scheduleFlush()
}

/** تسجيل عمليات في قائمة الدفع المؤجل (من DataContext عند كل تعديل محلي) */
export function enqueueCloudOps(
  ops: CloudOp[],
  deletes: CloudDelete[] = [],
  profile: AppData['settings']['profile'] | null = null,
): void {
  if (ops.length === 0 && deletes.length === 0 && !profile) return
  enqueue(ops, deletes, profile)
}

/** تحويل كل مستندات AppData إلى عمليات رفع (للمزامنة الأولية عند تسجيل الدخول) */
export function docsToOps(data: Pick<AppData, 'plans' | 'activities' | 'quizzes' | 'customCards' | 'weekEntries' | 'certificates'>): CloudOp[] {
  const ops: CloudOp[] = []
  for (const key of Object.keys(KIND_BY_ARRAY) as Array<keyof typeof KIND_BY_ARRAY>) {
    const kind = KIND_BY_ARRAY[key]
    for (const doc of data[key] ?? []) ops.push({ kind, doc: doc as CloudOp['doc'] })
  }
  return ops
}

/** دمج بيانات السحابة مع المحلية بالأحدث (updatedAt لكل مستند بالمعرف) */
export function mergeCloudIntoLocal(
  local: AppData,
  cloud: Partial<AppData>,
  cloudProfile?: AppData['settings']['profile'],
): AppData {
  const pick = <T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>()
    for (const d of a) map.set(d.id, d)
    for (const d of b) {
      const cur = map.get(d.id)
      if (!cur || d.updatedAt >= cur.updatedAt) map.set(d.id, d)
    }
    return [...map.values()]
  }
  const lp = local.settings.profile
  const cp = cloudProfile
  return {
    version: 1,
    savedAt: Date.now(),
    plans: pick(local.plans, cloud.plans ?? []),
    activities: pick(local.activities, cloud.activities ?? []),
    quizzes: pick(local.quizzes, cloud.quizzes ?? []),
    customCards: pick(local.customCards, cloud.customCards ?? []),
    weekEntries: pick(local.weekEntries ?? [], cloud.weekEntries ?? []),
    certificates: pick(local.certificates ?? [], cloud.certificates ?? []),
    settings: {
      profile: {
        name: cp?.name || lp.name,
        school: cp?.school || lp.school,
        semester: cp?.semester || lp.semester,
      },
    },
  }
}

/** دمج العمليات: الأحدث فوزًا حسب updatedAt لكل معرف */
function mergeOps(existing: CloudOp[], incoming: CloudOp[]): CloudOp[] {
  const map = new Map<string, CloudOp>()
  for (const op of [...existing, ...incoming]) {
    const key = `${op.kind}:${op.doc.id}`
    const current = map.get(key)
    if (!current || op.doc.updatedAt >= current.doc.updatedAt) map.set(key, op)
  }
  return [...map.values()]
}

function scheduleFlush(): void {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushNow()
  }, 1200)
}

/** تنفيذ الدفعة المعلقة فورًا (تُستدعى داخليًا وعند «مزامنة الآن»/عودة الاتصال) */
export async function flushNow(): Promise<boolean> {
  if (flushing) return false
  const userId = currentUserId
  if (!userId) return false
  const ops = queueOps
  const deletes = queueDeletes
  const profile = queueProfile
  if (ops.length === 0 && deletes.length === 0 && !profile) return true
  flushing = true
  const [up, del, prof] = await Promise.all([
    pushUpserts(ops, userId),
    pushDeletes(deletes, userId),
    profile ? pushProfile(profile, userId) : Promise.resolve({ ok: true } as CloudResult),
  ])
  const ok = up.ok && del.ok && prof.ok
  if (ok) {
    queueOps = []
    queueDeletes = []
    queueProfile = null
  }
  flushing = false
  onFlushResult?.(ok)
  return ok
}

/** هل توجد دفعة معلقة؟ */
export function hasPendingOps(): boolean {
  return queueOps.length > 0 || queueDeletes.length > 0 || queueProfile !== null
}

/** تفريغ القائمة يدويًا (خروج/اختبار) */
export function clearQueue(): void {
  queueOps = []
  queueDeletes = []
  queueProfile = null
  if (flushTimer !== null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

let currentUserId: string | null = null

/** تعيين هوية المستخدم الحالي للقائمة (من CloudContext) */
export function setSyncUser(userId: string | null): void {
  currentUserId = userId
  if (!userId) clearQueue()
}
