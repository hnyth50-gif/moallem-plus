import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { sortByUpdated } from '../lib/store'
import { formatRelative, formatPoints, dayKey, formatHijri, formatDate, formatTime } from '../lib/format'
import { BUILTIN_CARDS, cardOfDay, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/strategies'
import { Badge, Button, Card, DemoBadge, EmptyState, IconBadge } from '../components/UI'
import { useNow } from '../components/ClockWidget'
import { IconPlan, IconActivity, IconQuiz, IconCards, IconPlus, IconSparkles, IconAlert, IconSchool } from '../components/icons'
import { DocIcon, DocKindBadge } from '../components/DocListPage'
import { GoldFlourish } from '../components/GoldFlourish'
import type { PlanDoc, ActivityDoc, QuizDoc, ThinkingCard } from '../lib/types'

// ============ لوحة التحكم ============
// الصفحة الافتتاحية: تحية، اختصارات سريعة، إحصاءات، أحدث الأعمال، وبطاقة اليوم.

type AnyItem =
  | ({ docType: 'plan' } & PlanDoc)
  | ({ docType: 'activity' } & ActivityDoc)
  | ({ docType: 'quiz' } & QuizDoc)

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء الخير'
}

/** تحويل تاريخ محلي إلى ISO بصيغة yyyy-mm-dd (دون إزاحة المنطقة الزمنية) */
function localIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** نسبة أيام الأسبوع الدراسي (الأحد..الخميس) التي تحمل خطة مسجلة بتاريخها */
function weekCoverage(plans: PlanDoc[]): number {
  const now = new Date()
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  const dates = new Set(plans.map((p) => p.classDate).filter((x): x is string => Boolean(x)))
  let covered = 0
  for (let i = 0; i < 5; i++) {
    const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i)
    if (dates.has(localIso(d))) covered++
  }
  return covered / 5
}

/** حلقة الإنجاز — قوس ذهبي على مسار أخضر فاتح */
function ProgressRing({ value, caption }: { value: number; caption: string }) {
  const r = 33
  const c = 2 * Math.PI * r
  const pct = Math.round(value * 100)
  return (
    <div className="relative flex h-28 w-28 items-center justify-center" role="img" aria-label={`${caption}: ${pct}%`}>
      <svg viewBox="0 0 80 80" className="h-28 w-28 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(var(--brand-100))" strokeWidth="7" className="dark:opacity-25" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgb(var(--brand-600))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${value * c} ${c}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white" aria-hidden="true">
          {pct}٪
        </p>
        <p className="text-[10px] font-semibold text-slate-400" aria-hidden="true">
          تغطية
        </p>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, loadDemoData } = useData()
  const navigate = useNavigate()
  const name = data.settings.profile.name.trim()
  const school = data.settings.profile.school.trim()

  // الساعة والتاريخ الحيان (تتحدث كل ثانية عبر useNow)
  const now = useNow()
  const time = formatTime(now)
  const hijri = formatHijri(now)
  const gregorian = formatDate(now)

  // بيانات اليوم والأسبوع الحقيقية من مستندات المعلم
  const todayIso = localIso(new Date())
  const todayPlans = useMemo(
    () => data.plans.filter((p) => p.classDate === todayIso),
    [data.plans, todayIso],
  )
  const coverage = useMemo(() => weekCoverage(data.plans), [data.plans])
  const monogram = name ? name.charAt(0) : 'م'

  const counts = {
    plan: data.plans.length,
    activity: data.activities.length,
    quiz: data.quizzes.length,
    card: data.customCards.length,
  }
  const demoCounts =
    (data.plans.some((d) => d.demo) ? 1 : 0) +
    (data.activities.some((d) => d.demo) ? 1 : 0) +
    (data.quizzes.some((d) => d.demo) ? 1 : 0)

  const allEmpty = counts.plan === 0 && counts.activity === 0 && counts.quiz === 0 && counts.card === 0

  const recent: Array<AnyItem> = useMemo(() => {
    const items: AnyItem[] = [
      ...data.plans.map((p) => ({ ...p, docType: 'plan' as const })),
      ...data.activities.map((a) => ({ ...a, docType: 'activity' as const })),
      ...data.quizzes.map((q) => ({ ...q, docType: 'quiz' as const })),
    ]
    return sortByUpdated(items).slice(0, 6)
  }, [data])

  const todayCard: ThinkingCard = useMemo(
    () => cardOfDay(BUILTIN_CARDS, dayKey())!,
    [],
  )

  const statCards = [
    { kind: 'plan', label: 'خطط الدروس', value: counts.plan, icon: <IconPlan />, to: '/plans' },
    { kind: 'activity', label: 'الأنشطة', value: counts.activity, icon: <IconActivity />, to: '/activities' },
    { kind: 'quiz', label: 'الاختبارات', value: counts.quiz, icon: <IconQuiz />, to: '/quizzes' },
    { kind: 'custom', label: 'بطاقاتي الخاصة', value: counts.card, icon: <IconCards />, to: '/cards' },
  ] as const

  return (
    <>
      {/* بطاقة الترحيب الحية — هوية «زمرد وذهب» من التصميم الجديد */}
      <section
        aria-labelledby="dash-greeting"
        className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-l from-brand-950 via-brand-900 to-brand-800 p-5 text-white shadow-card sm:p-6"
      >
        <GoldFlourish className="pointer-events-none absolute -top-2 left-0 w-44 opacity-80 sm:w-56" />
        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1">
            <h1 id="dash-greeting" className="text-xl font-extrabold sm:text-2xl">
              {greeting()}
              <span className="text-gold-300">{name ? `، ${name}` : ' أيها المعلم'}</span> 👋
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-brand-100/85">
              مساحتك الموّحدة لإعداد الدروس — كل شيء يعمل على جهازك دون اتصال.
            </p>
            {school && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-gold-300/90">
                <IconSchool className="h-3.5 w-3.5" aria-hidden="true" />
                {school}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="الوقت والتاريخ اليوم">
              {hijri && (
                <span className="inline-flex flex-col items-start rounded-xl border border-gold-400/40 bg-white/10 px-3 py-1">
                  <span className="text-[9px] font-bold leading-none text-gold-300/90">الهجري</span>
                  <span className="text-xs font-bold leading-tight">{hijri}</span>
                </span>
              )}
              {gregorian && (
                <span className="inline-flex flex-col items-start rounded-xl bg-white/10 px-3 py-1">
                  <span className="text-[9px] font-bold leading-none text-brand-100/80">الميلادي</span>
                  <span className="text-xs font-semibold leading-tight text-brand-50">{gregorian}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-extrabold tabular-nums tracking-tight sm:text-5xl" role="timer" aria-label="الساعة الحية">
              {time}
            </p>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-400/70 bg-brand-950/50 text-xl font-bold text-gold-300"
              aria-hidden="true"
            >
              {monogram}
            </div>
          </div>
        </div>
      </section>

      {/* تغطية الأسبوع وخطط اليوم — من بيانات المستندات الفعلية */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing value={coverage} caption="تغطية خطط الأسبوع" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">تغطية خطط الأسبوع</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              أيام الدراسة (الأحد–الخميس) التي حملت خطة بتاريخها هذا الأسبوع.
            </p>
            <Link to="/plans/new" className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2 dark:text-brand-300">
              إضافة خطة لتغطية أكبر +
            </Link>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">خطط اليوم</h2>
            <Badge>{todayPlans.length} خطة</Badge>
          </div>
          {todayPlans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
              لا توجد خطط مسجلة لتاريخ اليوم — سجّل خطة بتاريخ اليوم لتظهر هنا.
            </p>
          ) : (
            <ul className="space-y-2">
              {todayPlans.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/plans/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
                  >
                    <span className="min-w-0 truncate font-semibold text-slate-800 dark:text-slate-100">
                      {p.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {p.subject}
                      {p.durationMinutes ? ` · ${p.durationMinutes} دقيقة` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {demoCounts > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200">
          <IconAlert className="mt-0.5" />
          <p className="flex-1">
            توجد عناصر تجريبية في بياناتك (مؤشّرة بشارة «تجريبي»). يمكنك إزالتها في أي وقت من{' '}
            <Link to="/settings" className="font-semibold underline underline-offset-2">
              الإعدادات
            </Link>
            .
          </p>
        </div>
      )}

      {/* اختصارات سريعة */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { to: '/plans/new', label: 'خطة درس جديدة', icon: <IconPlan /> },
          { to: '/activities/new', label: 'نشاط جديد', icon: <IconActivity /> },
          { to: '/quizzes/new', label: 'اختبار جديد', icon: <IconQuiz /> },
          { to: '/cards', label: 'مكتبة البطاقات', icon: <IconCards /> },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
          >
            <IconBadge size="md" className="transition group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600 dark:group-hover:bg-brand-600 dark:group-hover:text-white">
              {a.icon}
            </IconBadge>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{a.label}</span>
          </Link>
        ))}
      </div>

      {allEmpty ? (
        <EmptyState
          icon={<IconSparkles className="h-8 w-8" />}
          title="ابدأ رحلتك التعليمية"
          description="لم تُنشئ أي عناصر بعد. ابدأ بخطة درس جديدة، أو جرّب التطبيق بحزمة عناصر تجريبية (تعرف عليها بعلامة «تجريبي» وتُحذف بضغطة)."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/plans/new">
                <Button>
                  <IconPlus className="h-4 w-4" /> إنشاء خطة درس
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  loadDemoData()
                  navigate('/plans')
                }}
              >
                <IconSparkles className="h-4 w-4" /> تجربة ببيانات تجريبية
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* الإحصاءات وأحدث الأعمال */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-card transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
                >
                  <IconBadge size="sm" className="mx-auto mb-2">{s.icon}</IconBadge>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white" aria-label={`${s.label}: ${s.value}`}>
                    {formatPoints(s.value)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                </Link>
              ))}
            </div>

            <section aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                أحدث أعمالك
              </h2>
              <ul className="space-y-2">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`${item.docType === 'plan' ? '/plans' : item.docType === 'activity' ? '/activities' : '/quizzes'}/${item.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <IconBadge size="sm">
                          <DocIcon kind={item.docType} />
                        </IconBadge>
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
                        {'demo' in item && item.demo && <DemoBadge />}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <DocKindBadge kind={item.docType} />
                        <span>{formatRelative(item.updatedAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Link to="/settings" className="text-xs text-brand-700 underline underline-offset-2 dark:text-brand-300">
                  تصدير نسخة احتياطية من الإعدادات
                </Link>
              </div>
            </section>
          </div>

          {/* بطاقة اليوم */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">بطاقة اليوم</h2>
                <Badge className={CATEGORY_COLORS[todayCard.category]}>{CATEGORY_LABELS[todayCard.category]}</Badge>
              </div>
              <h3 className="mb-1 text-base font-bold text-brand-800 dark:text-brand-200">{todayCard.title}</h3>
              <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{todayCard.brief}</p>
              <ol className="mb-3 list-decimal space-y-1 ps-5 text-sm text-slate-600 dark:text-slate-300">
                {todayCard.steps.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{todayCard.timing}</span>
                <Link to={`/cards/${todayCard.id}`} className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">
                  تفاصيل البطاقة
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
