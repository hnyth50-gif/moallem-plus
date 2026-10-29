import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ActivityDoc, AppData, CertificateDoc, PlanDoc, QuizDoc, Settings, ThinkingCard, WeekEntry } from '../lib/types'
import { emptyData, removeFrom, upsertIn, downloadJson, mergeData, stripDemo } from '../lib/store'
import { loadAppState, saveAppState, SAVE_ERROR_MESSAGES } from '../lib/storage'
import { applyDemoToData } from '../lib/seed'
import { parseImport } from '../lib/validate'
import { clearAllFileBlobs, collectFileIds, deleteFileBlobIds } from '../lib/attachments'
import { useToast } from './ToastContext'
import { makeId } from '../lib/id'

// ============ سياق البيانات ============
// المخزن المحلي للمستخدم. أي تعديل يقوم على نسخة شفّافة من البيانات
// ويُحفظ فورًا في localStorage مع تنبيه المستخدم عند فشل الحفظ.

type Profile = Settings['profile']

interface DataContextValue {
  data: AppData
  ready: boolean
  savePlan: (doc: PlanDoc) => void
  saveActivity: (doc: ActivityDoc) => void
  saveQuiz: (doc: QuizDoc) => void
  saveCard: (doc: ThinkingCard) => void
  saveWeekEntry: (doc: WeekEntry) => void
  saveCertificate: (doc: CertificateDoc) => void
  deletePlan: (id: string) => void
  deleteActivity: (id: string) => void
  deleteQuiz: (id: string) => void
  deleteCard: (id: string) => void
  deleteWeekEntry: (id: string) => void
  deleteCertificate: (id: string) => void
  clearWeekEntries: () => void
  updateProfile: (p: Partial<Profile>) => void
  exportBackup: () => void
  importBackup: (raw: unknown, mode: 'merge' | 'replace') => { ok: boolean; reason?: string }
  loadDemoData: () => void
  removeDemoData: () => void
  deleteAllData: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [data, setData] = useState<AppData>(emptyData)
  const [ready, setReady] = useState(false)
  const loadedOnce = useRef(false)

  // التحميل الأولي
  useEffect(() => {
    if (loadedOnce.current) return
    loadedOnce.current = true
    const stored = loadAppState()
    if (stored && typeof stored === 'object') {
      setData((prev) => ({
        ...prev,
        ...stored,
        settings: {
          profile: {
            name: stored.settings?.profile?.name ?? prev.settings.profile.name,
            school: stored.settings?.profile?.school ?? prev.settings.profile.school,
            semester: stored.settings?.profile?.semester ?? prev.settings.profile.semester,
          },
        },
      }))
    }
    setReady(true)
  }, [])

  /** تحديث مضمن: نسخة جديدة ثم حفظ */
  const update = useCallback(
    (mutator: (draft: AppData) => void) => {
      setData((prev) => {
        const draft: AppData = {
          version: 1,
          savedAt: Date.now(),
          plans: [...prev.plans],
          activities: [...prev.activities],
          quizzes: [...prev.quizzes],
          customCards: [...prev.customCards],
          weekEntries: [...(prev.weekEntries ?? [])],
          certificates: [...(prev.certificates ?? [])],
          settings: { profile: { ...prev.settings.profile } },
        }
        mutator(draft)
        const result = saveAppState(draft)
        if (!result.ok && result.reason) toast(SAVE_ERROR_MESSAGES[result.reason], 'error')
        return draft
      })
    },
    [toast],
  )

  const savePlan = useCallback(
    (doc: PlanDoc) => update((d) => (d.plans = upsertIn(d.plans, doc))),
    [update],
  )
  const saveActivity = useCallback(
    (doc: ActivityDoc) => update((d) => (d.activities = upsertIn(d.activities, doc))),
    [update],
  )
  const saveQuiz = useCallback(
    (doc: QuizDoc) => update((d) => (d.quizzes = upsertIn(d.quizzes, doc))),
    [update],
  )
  const saveCard = useCallback(
    (doc: ThinkingCard) => update((d) => (d.customCards = upsertIn(d.customCards, doc))),
    [update],
  )
  const saveWeekEntry = useCallback(
    (doc: WeekEntry) => update((d) => (d.weekEntries = upsertIn(d.weekEntries ?? [], doc))),
    [update],
  )
  const saveCertificate = useCallback(
    (doc: CertificateDoc) => update((d) => (d.certificates = upsertIn(d.certificates ?? [], doc))),
    [update],
  )

  const deletePlan = useCallback(
    (id: string) => update((d) => (d.plans = removeFrom(d.plans, id))),
    [update],
  )
  const deleteActivity = useCallback(
    (id: string) => update((d) => (d.activities = removeFrom(d.activities, id))),
    [update],
  )
  const deleteQuiz = useCallback(
    (id: string) => update((d) => (d.quizzes = removeFrom(d.quizzes, id))),
    [update],
  )
  const deleteCard = useCallback(
    (id: string) => update((d) => (d.customCards = removeFrom(d.customCards, id))),
    [update],
  )
  const deleteWeekEntry = useCallback(
    (id: string) => update((d) => (d.weekEntries = removeFrom(d.weekEntries ?? [], id))),
    [update],
  )
  const deleteCertificate = useCallback(
    (id: string) => update((d) => (d.certificates = removeFrom(d.certificates ?? [], id))),
    [update],
  )
  const clearWeekEntries = useCallback(
    () => update((d) => (d.weekEntries = [])),
    [update],
  )

  const updateProfile = useCallback(
    (p: Partial<Profile>) =>
      update((d) => (d.settings.profile = { ...d.settings.profile, ...p })),
    [update],
  )

  const exportBackup = useCallback(() => {
    let snapshot: AppData | null = null
    setData((prev) => {
      snapshot = prev
      return prev
    })
    const payload = snapshot ?? loadAppState() ?? emptyData()
    downloadJson(payload.savedAt !== 0 ? payload : { ...payload, savedAt: Date.now() })
    toast('تم تنزيل النسخة الاحتياطية بنجاح — احفظها في مكان آمن.')
  }, [toast])

  const importBackup = useCallback(
    (raw: unknown, mode: 'merge' | 'replace'): { ok: boolean; reason?: string } => {
      const result = parseImport(raw)
      if (!result.ok || !result.data) return { ok: false, reason: result.reason }
      let orphanFileIds: string[] = []
      update((d) => {
        if (mode === 'replace') {
          // كتل ملفات المستندات القديمة التي لن تبقى بعد الاستبدال تُنظف من IndexedDB
          const nextIds = new Set(
            collectFileIds([...result.data!.plans, ...result.data!.activities, ...result.data!.quizzes]),
          )
          orphanFileIds = collectFileIds([...d.plans, ...d.activities, ...d.quizzes]).filter((id) => !nextIds.has(id))
        }
        if (mode === 'merge') {
          const merged = mergeData(d, result.data!)
          d.plans = merged.plans
          d.activities = merged.activities
          d.quizzes = merged.quizzes
          d.customCards = merged.customCards
          d.weekEntries = merged.weekEntries
          d.certificates = merged.certificates
          d.settings.profile = merged.settings.profile
        } else {
          d.plans = result.data!.plans
          d.activities = result.data!.activities
          d.quizzes = result.data!.quizzes
          d.customCards = result.data!.customCards
          d.weekEntries = result.data!.weekEntries
          d.certificates = result.data!.certificates
          d.settings.profile = result.data!.settings.profile
        }
      })
      if (orphanFileIds.length > 0) void deleteFileBlobIds(orphanFileIds)
      toast(`تم استيراد البيانات (${mode === 'merge' ? 'دمج مع' : 'استبدال'}) بنجاح.`)
      return { ok: true }
    },
    [update, toast],
  )

  const loadDemoData = useCallback(() => {
    update((d) => {
      const demo = applyDemoToData(d)
      d.plans = demo.plans
      d.activities = demo.activities
      d.quizzes = demo.quizzes
      d.customCards = demo.customCards
      d.weekEntries = demo.weekEntries
      d.certificates = demo.certificates
    })
    toast('أُضيفت عناصر تجريبية علامات «تجريبي» فيها — احذفها متى شئت من الإعدادات.')
  }, [update, toast])

  const removeDemoData = useCallback(() => {
    update((d) => {
      const clean = stripDemo(d)
      d.plans = clean.plans
      d.activities = clean.activities
      d.quizzes = clean.quizzes
      d.customCards = clean.customCards
      d.weekEntries = clean.weekEntries
      d.certificates = clean.certificates
    })
    toast('أُزيلت جميع العناصر التجريبية.')
  }, [update, toast])

  const deleteAllData = useCallback(() => {
    update((d) => {
      d.plans = []
      d.activities = []
      d.quizzes = []
      d.customCards = []
      d.weekEntries = []
      d.certificates = []
    })
    void clearAllFileBlobs()
    toast('حُذفت جميع بياناتك المحلية.')
  }, [update, toast])

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      ready,
      savePlan,
      saveActivity,
      saveQuiz,
      saveCard,
      saveWeekEntry,
      saveCertificate,
      deletePlan,
      deleteActivity,
      deleteQuiz,
      deleteCard,
      deleteWeekEntry,
      deleteCertificate,
      clearWeekEntries,
      updateProfile,
      exportBackup,
      importBackup,
      loadDemoData,
      removeDemoData,
      deleteAllData,
    }),
    [
      data,
      ready,
      savePlan,
      saveActivity,
      saveQuiz,
      saveCard,
      saveWeekEntry,
      saveCertificate,
      deletePlan,
      deleteActivity,
      deleteQuiz,
      deleteCard,
      deleteWeekEntry,
      deleteCertificate,
      clearWeekEntries,
      updateProfile,
      exportBackup,
      importBackup,
      loadDemoData,
      removeDemoData,
      deleteAllData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData خارج DataProvider')
  return ctx
}

/** اختصار: إنشاء مستند جديد فارغ */
export function newDoc<T extends { id: string; createdAt: number; updatedAt: number }>(
  mk: (id: string, createdAt: number, updatedAt: number) => T,
): T {
  const now = Date.now()
  return mk(makeId(), now, now)
}
