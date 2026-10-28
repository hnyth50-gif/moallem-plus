import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Doc } from '../lib/store'
import { useData } from '../state/DataContext'
import { cardById } from '../lib/lookup'
import { computeTotalPoints } from '../lib/quizEngine'
import { formatPoints, formatRelative } from '../lib/format'
import { Badge, Card, EmptyState, IconBadge } from './UI'
import { DocKindBadge } from './DocListPage'
import { IconActivity, IconCards, IconPlan, IconQuiz } from './icons'

// ============ المؤشرات ============
// إحصاءات حقيقية تُحسب من بيانات المعلم محليًا: أحجام المكتبة،
// توزيع صعوبة الأسئلة وأنواعها، أكثر الاستراتيجيات استخدامًا، وآخر التعديلات.

const DIFF_META: Record<string, { label: string; bar: string }> = {
  easy: { label: 'سهل', bar: 'bg-emerald-500' },
  medium: { label: 'متوسط', bar: 'bg-amber-500' },
  hard: { label: 'صعب', bar: 'bg-rose-500' },
}

const KIND_META: Record<string, { label: string; bar: string }> = {
  mcq: { label: 'اختيار من متعدد', bar: 'bg-brand-500' },
  tf: { label: 'صح / خطأ', bar: 'bg-cyan-500' },
  short: { label: 'إجابة قصيرة', bar: 'bg-violet-500' },
  essay: { label: 'مقالي', bar: 'bg-fuchsia-500' },
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3" aria-label={`${label}: ${formatPoints(value)}`}>
      <span className="w-28 shrink-0 text-xs text-slate-600 dark:text-slate-300">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-end text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
        {formatPoints(value)}
      </span>
    </div>
  )
}

function StatCard({ icon, value, label, href }: { icon: ReactNode; value: number; label: string; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700"
    >
      <IconBadge size="md">{icon}</IconBadge>
      <span>
        <span className="block text-2xl font-bold leading-7 tabular-nums text-slate-900 dark:text-white">
          {formatPoints(value)}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </span>
    </Link>
  )
}

export function Insights() {
  const { data } = useData()

  const stats = useMemo(() => {
    const allQuestions = data.quizzes.flatMap((q) => q.questions)
    const difficulty = { easy: 0, medium: 0, hard: 0 }
    const kinds = { mcq: 0, tf: 0, short: 0, essay: 0 }
    for (const q of allQuestions) {
      difficulty[q.difficulty] += 1
      kinds[q.kind] += 1
    }
    const strategyCounts = new Map<string, number>()
    for (const a of data.activities) {
      if (a.strategyId) strategyCounts.set(a.strategyId, (strategyCounts.get(a.strategyId) ?? 0) + 1)
    }
    const strategies = [...strategyCounts.entries()]
      .map(([id, count]) => ({ title: cardById(id, data.customCards)?.title ?? 'بطاقة محذوفة', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const docs: Array<Doc & { href: string; kindLabel: string }> = [
      ...data.plans.map((d) => ({ ...d, href: `/plans/${d.id}`, kindLabel: 'خطة' as const })),
      ...data.activities.map((d) => ({ ...d, href: `/activities/${d.id}`, kindLabel: 'نشاط' as const })),
      ...data.quizzes.map((d) => ({ ...d, href: `/quizzes/${d.id}`, kindLabel: 'اختبار' as const })),
    ]
    const recent = docs.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

    return {
      totalPlanMinutes: data.plans.reduce((s, p) => s + (p.durationMinutes ?? 0), 0),
      questionCount: allQuestions.length,
      totalPoints: data.quizzes.reduce((s, q) => s + computeTotalPoints(q.questions), 0),
      difficulty,
      kinds,
      strategies,
      recent,
      isEmpty:
        data.plans.length === 0 && data.activities.length === 0 && data.quizzes.length === 0 && data.customCards.length === 0,
    }
  }, [data])

  if (stats.isEmpty) {
    return (
      <EmptyState
        icon={<IconPlan />}
        title="لا بيانات بعد"
        description="ستظهر هنا إحصاءات حقيقية عن خططك وأنشطتك واختباراتك فور بدء استخدامك — كل شيء يُحسب محليًا على جهازك."
      />
    )
  }

  const diffMax = Math.max(1, ...Object.values(stats.difficulty))
  const kindMax = Math.max(1, ...Object.values(stats.kinds))

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<IconPlan />} value={data.plans.length} label="خطة درس" href="/plans" />
        <StatCard icon={<IconActivity />} value={data.activities.length} label="نشاط صفي" href="/activities" />
        <StatCard icon={<IconQuiz />} value={data.quizzes.length} label="اختبار" href="/quizzes" />
        <StatCard icon={<IconCards />} value={data.customCards.length} label="بطاقة مخصصة" href="/cards" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">حجم المكتبة</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            مجموع دقائق الخطط المعدّة: <span className="font-bold text-brand-700 dark:text-brand-300">{formatPoints(stats.totalPlanMinutes)}</span> دقيقة
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            عدد الأسئلة في الاختبارات: <span className="font-bold text-brand-700 dark:text-brand-300">{formatPoints(stats.questionCount)}</span> سؤالًا
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            مجموع الدرجات المصمّمة: <span className="font-bold text-brand-700 dark:text-brand-300">{formatPoints(stats.totalPoints)}</span> نقطة
          </p>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">توزيع صعوبة الأسئلة</h3>
          <div className="space-y-2.5">
            {(['easy', 'medium', 'hard'] as const).map((k) => (
              <Bar key={k} label={DIFF_META[k].label} value={stats.difficulty[k]} max={diffMax} color={DIFF_META[k].bar} />
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">توزيع أنواع الأسئلة</h3>
          <div className="space-y-2.5">
            {(['mcq', 'tf', 'short', 'essay'] as const).map((k) => (
              <Bar key={k} label={KIND_META[k].label} value={stats.kinds[k]} max={kindMax} color={KIND_META[k].bar} />
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">أكثر الاستراتيجيات استخدامًا</h3>
          {stats.strategies.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">اربط أنشطتك ببطاقات الاستراتيجيات لتظهر هنا.</p>
          ) : (
            <ol className="space-y-1.5">
              {stats.strategies.map((s, i) => (
                <li key={s.title} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700 dark:text-slate-200">
                    <span className="me-1.5 font-bold text-brand-700 dark:text-brand-300">{formatPoints(i + 1)}.</span>
                    {s.title}
                  </span>
                  <Badge>{formatPoints(s.count)} نشاط</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">آخر التعديلات</h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {stats.recent.map((d) => (
            <li key={d.id}>
              <Link
                to={d.href}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <IconBadge size="sm">
                    {d.kind === 'plan' ? <IconPlan /> : d.kind === 'activity' ? <IconActivity /> : <IconQuiz />}
                  </IconBadge>
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{d.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <DocKindBadge kind={d.kind} label={d.kindLabel} />
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelative(d.updatedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export default Insights
