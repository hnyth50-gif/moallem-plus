import type { Attachment, AttachmentKind } from './types'
import { makeId } from './id'

// ============ مرفقات المستندات ============
// الملفات تُخزَّن في IndexedDB (سعة أكبر بكثير من localStorage وتبقى دون اتصال)،
// أما النصوص وروابط يوتيوب فهي بيانات نصية خفيفة تُخزَّن مع المستند في localStorage.

/** الحد الأقصى لحجم الملف الواحد: 5 ميجابايت */
export const MAX_FILE_SIZE = 5 * 1024 * 1024
/** الحد الأقصى لعدد المرفقات في المستند الواحد */
export const MAX_ATTACHMENTS = 10
/** الحد الأقصى لطول النص المنسوخ */
export const MAX_TEXT_LENGTH = 10_000

export const ATTACH_KIND_META: Record<AttachmentKind, { label: string }> = {
  file: { label: 'ملف' },
  text: { label: 'نص منسوخ' },
  youtube: { label: 'رابط يوتيوب' },
}

/** يستخرج معرف فيديو يوتيوب من صيغ الروابط المعروفة، أو null إن كان الرابط غير صالح */
export function parseYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)
      return m ? m[1] : null
    }
    return null
  } catch {
    return null
  }
}

/** رابط المشاهدة القياسي من معرّف الفيديو */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/** صورة مصغرة للفيديو من خوادم يوتيوب (تختفي بلاءً عند الانقطاع) */
export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/** حجم مقروء بالعربية: كيلوبايت/ميجابايت بأرقام غربية */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 1 })} م.ب`
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('ar-EG-u-nu-latn')} ك.ب`
}

// ---------- تخزين الملفات في IndexedDB ----------

const DB_NAME = 'moallem-plus-files'
const DB_VERSION = 1
const STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexeddb-open-failed'))
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = run(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error('indexeddb-request-failed'))
        tx.oncomplete = () => db.close()
      }),
  )
}

/** يخزن محتوى ملف مرفق بمفتاح معرف المرفق */
export async function putFileBlob(id: string, blob: Blob): Promise<void> {
  await withStore('readwrite', (store) => store.put(blob, id))
}

/** يسترجع ملفًا مخزنًا (لفتحه أو تنزيله) */
export async function getFileBlob(id: string): Promise<Blob | undefined> {
  try {
    return await withStore<Blob | undefined>('readonly', (store) => store.get(id))
  } catch {
    return undefined
  }
}

/** يحذف ملفًا مخزنًا بمُعرف المرفق */
export async function deleteFileBlob(id: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id))
  } catch {
    /* الحذف احتياطي — تجاهل الفشل الصامت */
  }
}

/** ينظف ملفات قائمة مرفقات (عند حذف مستند أو استبداله) */
export async function deleteFileBlobs(attachments: Attachment[] | undefined): Promise<void> {
  if (!attachments || attachments.length === 0) return
  for (const a of attachments) {
    if (a.kind === 'file') await deleteFileBlob(a.id)
  }
}

/** يجمع كل معرفات ملفات المستندات (للتنظيف الشامل) */
export function collectFileIds(docs: Array<{ attachments?: Attachment[] }>): string[] {
  return docs.flatMap((d) => (d.attachments ?? []).filter((a) => a.kind === 'file').map((a) => a.id))
}

/** يفرغ مخزن الملفات بالكامل (مع حذف كل البيانات) */
export async function clearAllFileBlobs(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.clear())
  } catch {
    /* تجاهل */
  }
}

/** ينشئ مرفق ملف جديد من ملف مختار (بياناته الوصفية فقط — المحتوى في IndexedDB) */
export function newFileAttachment(file: File): Attachment {
  return {
    id: makeId(),
    kind: 'file',
    name: file.name,
    size: file.size,
    mime: file.type || 'application/octet-stream',
  }
}
