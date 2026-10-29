import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cloudConfigured, getSupabaseClient, resetSupabaseClient } from '../lib/supabaseClient'
import { clearQueue, setFlushListener, setSyncUser } from '../lib/cloudSync'
import type { SupabaseSession } from '../lib/supabaseTypes'

// ============ سياق الحساب السحابي (Supabase Auth) ============
// إدارة جلسة المستخدم وحالة المزامنة. التطبيق يعمل محليًا دائمًا؛
// وعند تسجيل الدخول تصبح السحابة مصدر الحقيقة والمحلي طبقة عمل دون اتصال.

export interface CloudUser {
  id: string
  email: string
}

export type CloudStatus = 'unavailable' | 'loading' | 'signedOut' | 'signedIn'
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline'

export interface CloudContextValue {
  status: CloudStatus
  user: CloudUser | null
  cloudAvailable: boolean
  syncState: SyncState
  lastSyncedAt: number | null
  signIn: (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>
  signUp: (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>
  signOut: () => Promise<void>
  /** يزيد عدادًا يطلب من طبقة البيانات إعادة سحب/دفع فوري («مزامنة الآن») */
  requestSync: () => void
  syncNonce: number
  markSyncing: () => void
  markSynced: () => void
  markSyncError: () => void
}

const CloudContext = createContext<CloudContextValue | null>(null)

/** رسائل خطأ المصادقة بالعربية */
export function mapAuthError(message: string): string {
  const m = (message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
  if (m.includes('email not confirmed')) return 'لم يتم تأكيد البريد الإلكتروني بعد — راجع صندوق الوارد.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'هذا البريد مسجل مسبقًا — جرّب تسجيل الدخول.'
  if (m.includes('password') && (m.includes('at least') || m.includes('should be') || m.includes('weak')))
    return 'كلمة المرور قصيرة — استخدم 6 محارف على الأقل.'
  if (m.includes('valid email') || m.includes('invalid email')) return 'صيغة البريد الإلكتروني غير صحيحة.'
  if (m.includes('rate limit')) return 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة.'
  if (m.includes('signup requires email confirmation') || m.includes('confirmation email sent'))
    return 'أُرسل رابط تأكيد إلى بريدك — أكّد التسجيل ثم سجّل الدخول.'
  return 'تعذر الاتصال بالخدمة — تحقق من الشبكة ثم أعد المحاولة.'
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CloudStatus>(() => (cloudConfigured() ? 'loading' : 'unavailable'))
  const [user, setUser] = useState<CloudUser | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [syncNonce, setSyncNonce] = useState(0)
  const [initNonce, setInitNonce] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const applySession = useCallback((session: SupabaseSession | null) => {
    const next = session?.user
      ? { id: session.user.id, email: session.user.email ?? '' }
      : null
    setUser(next)
    setSyncUser(next?.id ?? null)
    if (!next) {
      clearQueue()
      setSyncState('idle')
      setLastSyncedAt(null)
    }
    setStatus(next ? 'signedIn' : 'signedOut')
  }, [])

  useEffect(() => {
    if (!cloudConfigured()) {
      setStatus('unavailable')
      return
    }
    const client = getSupabaseClient()
    if (!client) {
      // المكتبة لم تُحمَّل بعد (أو تعذر CDN) — نحاول لاحقًا عند عودة الاتصال
      setStatus('unavailable')
      return
    }
    let unsub: (() => void) | null = null
    void (async () => {
      const { data } = await client.auth.getSession()
      if (!mounted.current) return
      applySession(data.session)
      const sub = client.auth.onAuthStateChange((_event, session) => {
        if (!mounted.current) return
        applySession(session)
      })
      unsub = () => sub.data.subscription.unsubscribe()
    })()
    return () => {
      unsub?.()
    }
  }, [applySession, initNonce])

  // استماع لعودة الاتصال: إعادة تهيئة الجلسة وإنهاء الدفع المعلق
  useEffect(() => {
    const onOnline = () => {
      setSyncState((s) => (s === 'error' || s === 'offline' ? 'idle' : s))
      if (cloudConfigured()) {
        resetSupabaseClient()
        setInitNonce((n) => n + 1)
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient()
    if (!client) return { ok: false, reason: 'المزامنة السحابية غير متاحة الآن.' }
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, reason: mapAuthError(error.message) }
    return { ok: true }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient()
    if (!client) return { ok: false, reason: 'المزامنة السحابية غير متاحة الآن.' }
    const { data, error } = await client.auth.signUp({ email: email.trim(), password })
    if (error) return { ok: false, reason: mapAuthError(error.message) }
    if (!data.session) return { ok: true, reason: 'needs-confirmation' }
    return { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    const client = getSupabaseClient()
    clearQueue()
    setSyncUser(null)
    setSyncState('idle')
    setLastSyncedAt(null)
    setUser(null)
    setStatus('signedOut')
    if (client) await client.auth.signOut()
  }, [])

  const markSyncing = useCallback(() => setSyncState('syncing'), [])
  const markSynced = useCallback(() => {
    setSyncState('idle')
    setLastSyncedAt(Date.now())
  }, [])
  const markSyncError = useCallback(() => setSyncState('error'), [])
  const requestSync = useCallback(() => setSyncNonce((n) => n + 1), [])

  // نتيجة كل دفعة دفع تحدّث حالة المزامنة
  useEffect(() => {
    setFlushListener((ok) => {
      if (!mounted.current) return
      if (ok) {
        setSyncState('idle')
        setLastSyncedAt(Date.now())
      } else {
        setSyncState('error')
      }
    })
    return () => setFlushListener(null)
  }, [])

  const value = useMemo<CloudContextValue>(
    () => ({
      status,
      user,
      cloudAvailable: cloudConfigured(),
      syncState,
      lastSyncedAt,
      signIn,
      signUp,
      signOut,
      requestSync,
      syncNonce,
      markSyncing,
      markSynced,
      markSyncError,
    }),
    [status, user, syncState, lastSyncedAt, signIn, signUp, signOut, requestSync, syncNonce, markSyncing, markSynced, markSyncError],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext)
  if (!ctx) throw new Error('useCloud خارج CloudProvider')
  return ctx
}
