import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, IconBadge } from './UI'
import { IconClose, IconDownload } from './icons'
import { INSTALL_PROMPT_KEY } from '../lib/storage'
import { installUiAllowed } from '../lib/install'
import { cn } from '../lib/cn'

// ============ نافذة إعلام المستخدم بإمكانية تثبيت التطبيق ============
// - Chromium (أندرويد/سطح المكتب): نلتقط حدث beforeinstallprompt ونعرض زر «تثبيت الآن»
//   الذي يستدعي prompt() الرسمي للمتصفح.
// - آيفون/آيباد (سفاري): الحدث غير مدعوم، فنعرض تعليمات «إضافة إلى الشاشة الرئيسية».
// - رفض المستخدم يكتم النافذة 30 يومًا (localStorage)، والتثبيت يكتمها نهائيًا.
// - لا تظهر أبدًا داخل وضع standalone (أي أنها مثبتة أصلًا).

// حدث التثبيت الذي يوفره Chromium (غير معرّف في مكتبة DOM القياسية)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000 // 30 يومًا

type Mode = 'chrome' | 'ios'

function storedSuppression(): boolean {
  try {
    const raw = window.localStorage.getItem(INSTALL_PROMPT_KEY)
    if (!raw) return false
    if (raw === 'installed') return true
    const t = Number(raw)
    return Number.isFinite(t) && Date.now() - t < SUPPRESS_MS
  } catch {
    return false
  }
}

function rememberSuppression(value: number | 'installed'): void {
  try {
    window.localStorage.setItem(INSTALL_PROMPT_KEY, String(value))
  } catch {
    /* تجاهل — التخزين غير متاح (وضع خاص؟) */
  }
}

function isAppleMobile(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isRunningStandalone(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    /* بيئة بلا matchMedia */
  }
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
}

export function InstallPrompt({ delayMs = 1600 }: { delayMs?: number } = {}) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [entered, setEntered] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const timerRef = useRef<number | null>(null)

  const hide = useCallback((suppression: number | 'installed' | null) => {
    if (suppression !== null) rememberSuppression(suppression)
    setEntered(false)
    // ننتظر انتهاء انتقال الخروج قبل إزالة العنصر من الشجرة
    window.setTimeout(() => setMode(null), 260)
  }, [])

  const show = useCallback(
    (m: Mode) => {
      if (timerRef.current !== null) return // مؤقت مجدول أصلًا
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        if (storedSuppression()) return
        setMode(m)
      }, delayMs)
    },
    [delayMs],
  )

  useEffect(() => {
    if (!installUiAllowed()) return
    if (isRunningStandalone()) return // التطبيق مثبت أصلًا
    if (storedSuppression()) return

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault() // نمنع نافذة المتصفح الافتراضية ونديرها بنفسنا
      deferredRef.current = e as BeforeInstallPromptEvent
      show('chrome')
    }
    const onInstalled = () => {
      rememberSuppression('installed')
      hide('installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (isAppleMobile()) show('ios')

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [show, hide])

  // حركة ظهور ناعمة: تفعيل الانتقال بعد أول رسم
  useEffect(() => {
    if (!mode) return
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [mode])

  const onInstall = useCallback(async () => {
    const e = deferredRef.current
    if (!e) {
      hide(null)
      return
    }
    try {
      await e.prompt()
      const choice = await e.userChoice
      if (choice.outcome === 'accepted') hide('installed')
      else hide(Date.now())
    } catch {
      // المتصفح رفض الاستدعاء (إلغاء أو بيئة غير داعمة) — نخفي دون حفظ رفض
      hide(null)
    }
  }, [hide])

  if (!mode) return null

  const title =
    mode === 'chrome' ? 'ثبّت «معلّم بلس» على جهازك' : 'أضف «معلّم بلس» إلى شاشتك الرئيسية'
  const desc =
    mode === 'chrome'
      ? 'أضف التطبيق إلى شاشتك الرئيسية واعمل عليه حتى دون اتصال بالإنترنت.'
      : 'على آيفون أو آيباد: اضغط زر المشاركة في سفاري، ثم اختر «إضافة إلى الشاشة الرئيسية».'

  return (
    <div
      role="status"
      aria-label="تنبيه إمكانية تثبيت التطبيق"
      className={cn(
        'no-print fixed bottom-3 z-40 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40',
        'inset-x-3 sm:inset-x-auto sm:right-5 sm:max-w-sm',
        'transition-all duration-300 ease-out',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      )}
    >
      <IconBadge size="md" className="bg-brand-700 text-white ring-brand-700 dark:bg-brand-700 dark:text-white dark:ring-brand-700" aria-hidden="true">
        <IconDownload />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{desc}</p>
        <div className="mt-3 flex items-center gap-2">
          {mode === 'chrome' ? (
            <>
              <Button size="sm" onClick={onInstall}>
                تثبيت الآن
              </Button>
              <Button size="sm" variant="ghost" onClick={() => hide(Date.now())}>
                لاحقًا
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => hide(Date.now())}>
              فهمت
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => hide(Date.now())}
        aria-label="إغلاق تنبيه التثبيت"
        className="-m-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700/60 dark:hover:text-slate-300"
      >
        <IconClose />
      </button>
    </div>
  )
}
