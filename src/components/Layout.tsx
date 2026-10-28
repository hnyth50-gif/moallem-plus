import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useTheme } from '../state/ThemeContext'
import { cn } from '../lib/cn'
import { Button } from './UI'
import { IconHome, IconPlan, IconActivity, IconQuiz, IconCards, IconSettings, IconMenu, IconClose, IconSun, IconMoon, IconClock } from './icons'

// ============ التخطيط العام ============
// ترويسة لاصقة + قائمة يراعي شاشات الجوال، وشعار داكن/فاتح، وتذييل الخصوصية.

const NAV_ITEMS = [
  { to: '/', label: 'الرئيسية', icon: IconHome, end: true },
  { to: '/plans', label: 'خطط الدروس', icon: IconPlan },
  { to: '/activities', label: 'الأنشطة', icon: IconActivity },
  { to: '/quizzes', label: 'الاختبارات', icon: IconQuiz },
  { to: '/cards', label: 'بطاقات التفكير', icon: IconCards },
  { to: '/tools', label: 'أدوات الصف', icon: IconClock },
  { to: '/settings', label: 'الإعدادات', icon: IconSettings },
]

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-9 w-9" role="img" aria-label="شعار معلّم بلس">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#115e59" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />
      <path d="M30 17c-4.5-3-11-4-16-2.2V45c5-1.8 11.5-.8 16 2.2V17z" fill="#ffffff" fillOpacity="0.92" />
      <path d="M34 17c4.5-3 11-4 16-2.2V45c-5-1.8-11.5-.8-16 2.2V17z" fill="#99f6e4" />
      <circle cx="49.5" cy="16.5" r="11" fill="#f59e0b" />
      <path d="M49.5 10.5v12M43.5 16.5h12" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

const NAV_CLASS =
  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600'
const NAV_ACTIVE =
  'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-200'
const NAV_IDLE = 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'

function ThemeToggle() {
  const { isDark, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-lg"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </Button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const onClick = (e: MouseEvent) => {
      if (
        navPanelRef.current &&
        !navPanelRef.current.contains(e.target as Node) &&
        !menuButtonRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [menuOpen])

  useEffect(() => setMenuOpen(false), [location.hash])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 z-50 rounded-lg bg-brand-700 px-3 py-1.5 text-sm text-white"
      >
        تخطَّ إلى المحتوى الرئيسي
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600" aria-label="معلّم بلس — الصفحة الرئيسية">
            <Logo />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">معلّم بلس</span>
              <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">مساحة عمل المعلم</span>
            </span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(NAV_CLASS, isActive ? NAV_ACTIVE : NAV_IDLE)}
              >
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              className={cn('rounded-lg p-2 lg:hidden', NAV_IDLE)}
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-nav" ref={navPanelRef} className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <nav aria-label="التنقل الرئيسي (الجوال)" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(NAV_CLASS, isActive ? NAV_ACTIVE : NAV_IDLE)}
                  onClick={() => setMenuOpen(false)}
                >
                  <item.icon />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white py-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:flex-row sm:justify-between sm:text-start">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            كل بياناتك محفوظة على جهازك فقط (‏localStorage) — لا خادم ولا حسابات.{' '}
            <Link to="/settings" className="underline underline-offset-2 hover:text-brand-700 dark:hover:text-brand-300">
              الإعدادات والأدوات
            </Link>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">معلّم بلس · نسخة 1.0</p>
        </div>
      </footer>
    </div>
  )
}
