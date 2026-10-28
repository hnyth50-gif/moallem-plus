import { useEffect, useState } from 'react'
import { formatHijri, formatDate, formatTime } from '../lib/format'
import { Card } from './UI'
import { cn } from '../lib/cn'

// ============ الساعة والتاريخ ============
// ساعة حيّة تُحدّث كل ثانية، مع التاريخ الهجري (أم القرى) والميلادي.
// وضعان: «header» مضغوط لترويسة كل الصفحات، و«full» كبير للوحة التحكم.

export function ClockWidget({ variant = 'header' }: { variant?: 'header' | 'full' }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = formatTime(now)
  const hijri = formatHijri(now)
  const gregorian = formatDate(now)

  if (variant === 'header') {
    return (
      <div className="hidden text-end leading-tight xl:block" aria-label="الوقت والتاريخ اليوم">
        <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{time}</p>
        {hijri && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hijri}</p>}
        {gregorian && <p className="text-[11px] text-slate-400 dark:text-slate-500">{gregorian}</p>}
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 sm:gap-8"
      aria-label="الوقت والتاريخ اليوم"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3.2 2" />
          </svg>
        </span>
        <p
          className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-5xl"
          role="timer"
        >
          {time}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 text-start sm:flex-row sm:gap-6">
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2 dark:border-brand-900 dark:bg-brand-900/20">
          <p className="text-[11px] font-bold text-brand-700 dark:text-brand-300">الهجري</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{hijri || '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الميلادي</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{gregorian || '—'}</p>
        </div>
      </div>
    </div>
  )
}

export default ClockWidget

/** حاوية بطاقة الساعة للوحة التحكم (تفصل الاستيراد عن الاستخدام) */
export function ClockCard({ className }: { className?: string }) {
  return (
    <Card className={cn('py-4', className)}>
      <ClockWidget variant="full" />
    </Card>
  )
}
