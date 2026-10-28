import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { sortByUpdated } from '../lib/store'
import { formatRelative, dayKey } from '../lib/format'
import { BUILTIN_CARDS, cardOfDay, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/strategies'
import { Badge, Button, Card, DemoBadge, PageHeader, EmptyState } from '../components/UI'
import { ClockCard } from '../components/ClockWidget'
import { IconPlan, IconActivity, IconQuiz, IconCards, IconPlus, IconSparkles, IconAlert } from '../components/icons'
import { KIND_LABEL } from '../components/DocListPage'
import type { ActivityDoc, PlanDoc, QuizDoc, ThinkingCard } from '../lib/types'

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

export function Dashboard() {
  const { data, loadDemoData } = useData()
  const navigate = useNavigate()
  const name = data.settings.profile.name.trim()

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
      <PageHeader
        title={`${greeting()}${name ? `، ${name}` : ' أيها المعلم'} 👋`}
        subtitle="مساحتك الموّحدة لإعداد الدروس — كل شيء يعمل على جهازك دون اتصال."
      />

      {/* الساعة والتاريخ الهجري والميلادي */}
      <ClockCard className="mb-6" />

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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-900/50 dark:text-brand-300">
              {a.icon}
            </span>
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
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 dark:text-brand-300">{s.icon}</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white" aria-label={`${s.label}: ${s.value}`}>
                    {s.value.toLocaleString('ar-EG')}
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
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
                        {'demo' in item && item.demo && <DemoBadge />}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Badge>{KIND_LABEL[item.docType]}</Badge>
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
            <Card className="sticky top-24">
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
