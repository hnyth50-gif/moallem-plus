import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeId } from '../lib/id'

// ============ سياق التنبيهات (Toasts) ============
// شريط رسائل خفيف في أسفل الشاشة مع aria-live لإتاحة النص للقارئات الشاشة.

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-slate-700 text-white dark:bg-slate-600',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = makeId('toast')
      setToasts((prev) => [...prev.slice(-2), { id, type, message }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000),
      )
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg ${TYPE_STYLES[t.type]}`}
          >
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label={`إغلاق تنبيه: ${t.message}`}
              className="rounded-lg p-1 opacity-80 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast خارج ToastProvider')
  return ctx
}
