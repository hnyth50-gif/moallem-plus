import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatClock } from '../lib/format'
import { sortByUpdated } from '../lib/store'
import { Badge, Button, Card, EmptyState, Field, Input, Select } from './UI'
import { IconClock, IconPause, IconPlay, IconRefresh } from './icons'
import { cn } from '../lib/cn'

// ============ المؤقت الصفي ============
// أداة عرض كبيرة للحصة: مؤقت تنازلي حر، أو تشغيل خطوات نشاط محفوظ
// خطوةً خطوة مع العدّ التنازلي لكل خطوة (يعمل من أجلك متى دقّقت الزمن).
// الحساب مبني على طوابع الزمن (endAt) لا على عدد النبضات، فلا ينحرف العد.

type Phase = 'idle' | 'running' | 'paused' | 'done'
type Mode = 'free' | 'steps'

const TICK_MS = 250

interface StepItem {
  text: string
  minutes: number
}

export function ClassTimer() {
  const { data } = useData()
  const [params] = useSearchParams()

  const activities = useMemo(
    () => sortByUpdated(data.activities).filter((a) => a.steps.some((s) => (s.minutes ?? 0) > 0)),
    [data.activities],
  )

  // وضع الدقائق عبر رابط عميق: ‎/tools?tab=timer&activity=<id>‎
  const deepLinkId = params.get('activity') ?? ''
  const [mode, setMode] = useState<Mode>(deepLinkId ? 'steps' : 'free')
  const [selectedId, setSelectedId] = useState(deepLinkId || '')
  const [stepIdx, setStepIdx] = useState(0)

  const [minutes, setMinutes] = useState('5')
  const [seconds, setSeconds] = useState('0')

  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(0)
  const endAtRef = useRef(0)
  const intervalRef = useRef<number | null>(null)

  const activity = activities.find((a) => a.id === selectedId) ?? data.activities.find((a) => a.id === selectedId)
  const steps: StepItem[] = useMemo(
    () =>
      (activity?.steps ?? [])
        .filter((s) => (s.minutes ?? 0) > 0)
        .map((s) => ({ text: s.text, minutes: s.minutes as number })),
    [activity],
  )
  const currentStep = steps[stepIdx]
  const nextStep = steps[stepIdx + 1]

  /** المدة الكلية للسياق الحالي (ملي ثانية) */
  const totalMs = useMemo(() => {
    if (mode === 'steps') return (currentStep?.minutes ?? 0) * 60_000
    const m = Math.max(0, Math.min(300, Number(minutes) || 0))
    const s = Math.max(0, Math.min(59, Number(seconds) || 0))
    return (m * 60 + s) * 1000
  }, [mode, currentStep, minutes, seconds])

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stopInterval()
    setPhase('idle')
    setRemaining(0)
  }, [stopInterval])

  // النبض الدوري أثناء التشغيل: نقرأ من طابع النهاية لا من طرح متكرر
  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      const left = endAtRef.current - Date.now()
      if (left <= 0) {
        stopInterval()
        setRemaining(0)
        setPhase('done')
      } else {
        setRemaining(left)
      }
    }
    intervalRef.current = window.setInterval(tick, TICK_MS)
    tick()
    return stopInterval
  }, [phase, stopInterval])

  // إعادة ضبط عند تبديل النمط أو النشاط
  useEffect(() => {
    stopInterval()
    setPhase('idle')
    setRemaining(0)
    setStepIdx(0)
  }, [mode, selectedId, stopInterval])

  // اختصار المسافة: بدء/إيقاف مؤقت (خارج الحقول والأزرار)
  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ') return
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, select, textarea, button')) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  /** الوقت المعروض: أثناء التشغيل/التوقف = المتبقي، والسكون = المدة الكاملة، والانتهاء = صفر */
  const displayMs =
    phase === 'running' || phase === 'paused' ? remaining : phase === 'done' ? 0 : totalMs
  const totalSecondsLeft = Math.ceil(displayMs / 1000)
  const progress = totalMs > 0 ? (totalMs - displayMs) / totalMs : 0

  const start = () => {
    const ms = remaining > 0 ? remaining : totalMs
    if (ms <= 0) return
    endAtRef.current = Date.now() + ms
    setRemaining(ms)
    setPhase('running')
  }
  const pause = () => {
    if (phase !== 'running') return
    stopInterval()
    setRemaining(Math.max(0, endAtRef.current - Date.now()))
    setPhase('paused')
  }
  function toggle() {
    if (phase === 'running') pause()
    else if (phase === 'paused' || (phase === 'idle' && totalMs > 0)) start()
  }

  const advanceStep = () => {
    if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1)
      setPhase('idle')
      setRemaining(0)
    } else {
      reset()
      setStepIdx(0)
    }
  }

  const ring = (r: number) => 2 * Math.PI * r

  const display = (
    <div className="flex flex-col items-center">
      <div className="relative" role="timer" aria-label={`الوقت المتبقي ${formatClock(totalSecondsLeft)}`}>
        <svg viewBox="0 0 260 260" className="h-56 w-56 sm:h-64 sm:w-64 -rotate-90">
          <circle cx="130" cy="130" r="112" fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-700" />
          <circle
            cx="130"
            cy="130"
            r="112"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className={cn(
              'transition-[stroke-dashoffset] duration-200 ease-linear',
              phase === 'done' ? 'stroke-rose-500' : 'stroke-brand-600 dark:stroke-brand-400',
            )}
            strokeDasharray={ring(112)}
            strokeDashoffset={ring(112) * (1 - Math.min(1, Math.max(0, progress)))}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span
            className={cn(
              'font-bold tabular-nums tracking-tight text-slate-900 dark:text-white',
              'text-5xl sm:text-6xl',
              phase === 'done' && 'text-rose-600 dark:text-rose-400',
            )}
            dir="ltr"
          >
            {formatClock(totalSecondsLeft)}
          </span>
        </div>
      </div>

      <div className="mt-4 h-6 text-center">
        {phase === 'done' ? (
          <p className="animate-pulse text-lg font-bold text-rose-600 dark:text-rose-400" aria-live="assertive">
            {mode === 'steps' && stepIdx + 1 < steps.length ? 'انتهت الخطوة — جاهز للتي بعدها' : 'انتهى الوقت'}
          </p>
        ) : phase === 'paused' ? (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">متوقف مؤقتًا</p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === 'steps' && currentStep ? `الخطوة ${stepIdx + 1} من ${steps.length}` : 'مؤقت حر'}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {phase === 'running' ? (
          <Button size="lg" onClick={pause} aria-label="إيقاف مؤقت">
            <IconPause /> إيقاف مؤقت
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={start}
            disabled={phase === 'done' || totalMs <= 0 || (remaining <= 0 && phase === 'paused')}
          >
            <IconPlay /> {phase === 'paused' ? 'متابعة' : 'ابدأ'}
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={reset} aria-label="تصفير المؤقت">
          <IconRefresh /> تصفير
        </Button>
      </div>
    </div>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="flex flex-col items-center gap-2 py-8">
          {mode === 'steps' && activity && (
            <Badge className="mb-1 bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
              {activity.title}
            </Badge>
          )}
          {display}
          {mode === 'steps' && currentStep && (
            <div className="mt-6 w-full max-w-xl text-center" aria-live="polite">
              <p className="text-xl font-bold leading-8 text-slate-900 dark:text-white">{currentStep.text}</p>
              {nextStep && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  التالي: <span className="font-medium">{nextStep.text}</span> ({formatClock(nextStep.minutes * 60)})
                </p>
              )}
              {phase === 'done' && stepIdx + 1 < steps.length && (
                <Button className="mt-4" onClick={advanceStep}>
                  <IconPlay /> الخطوة التالية
                </Button>
              )}
              {phase === 'done' && stepIdx + 1 >= steps.length && (
                <Button className="mt-4" variant="outline" onClick={advanceStep}>
                  <IconRefresh /> إعادة النشاط من البداية
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* لوحة التحكم */}
      <Card className="space-y-4 self-start">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="نمط المؤقت">
          <Button
            variant={mode === 'free' ? 'primary' : 'outline'}
            onClick={() => setMode('free')}
          >
            <IconClock /> مؤقت حر
          </Button>
          <Button
            variant={mode === 'steps' ? 'primary' : 'outline'}
            onClick={() => setMode('steps')}
            disabled={activities.length === 0 && !activity}
          >
            خطوات نشاط
          </Button>
        </div>

        {mode === 'free' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="الدقائق" htmlFor="timer-minutes">
              <Input
                id="timer-minutes"
                type="number"
                min={0}
                max={300}
                inputMode="numeric"
                value={minutes}
                onChange={(e) => {
                  setMinutes(e.target.value)
                  reset()
                }}
              />
            </Field>
            <Field label="الثواني" htmlFor="timer-seconds">
              <Input
                id="timer-seconds"
                type="number"
                min={0}
                max={59}
                inputMode="numeric"
                value={seconds}
                onChange={(e) => {
                  setSeconds(e.target.value)
                  reset()
                }}
              />
            </Field>
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={<IconClock />}
            title="لا أنشطة بخطوات مؤقتة"
            description="أضف زمنًا (دقائق) لخطوات نشاط من محرر الأنشطة، ثم عد إلى هنا لتشغيله أمام الصف."
          />
        ) : (
          <>
            <Field label="اختر النشاط" htmlFor="timer-activity">
              <Select id="timer-activity" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">— اختر —</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </Field>
            {steps.length > 0 && (
              <ol className="space-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label="خطوات النشاط">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className={cn(
                      'rounded-lg px-2 py-1.5',
                      i === stepIdx && 'bg-brand-50 font-medium text-brand-900 dark:bg-brand-900/40 dark:text-brand-100',
                    )}
                  >
                    {i + 1}. {s.text} — {formatClock(s.minutes * 60)}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          نصيحة: اعرض هذه الشاشة على جهاز العرض، ومفتاح المسافة يشغّل/يوقف المؤقت.
        </p>
      </Card>
    </div>
  )
}

export default ClassTimer
