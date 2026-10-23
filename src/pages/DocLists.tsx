import type { PlanDoc, ActivityDoc, QuizDoc } from '../lib/types'
import { useData } from '../state/DataContext'
import { DocListPage } from '../components/DocListPage'
import { formatRelative, pointsLabel } from '../lib/format'
import { IconPlan, IconActivity, IconQuiz } from '../components/icons'
import { computeTotalPoints } from '../lib/quizEngine'
import { formatPoints } from '../lib/format'

// ============ صفحات القوائم الثلاث (خطط / أنشطة / اختبارات) ============
// شكل موحّد عبر DocListPage مع معلومات ملخّصة مختلفة لكل نوع.

export function PlansList() {
  const { data, savePlan, deletePlan } = useData()
  return (
    <DocListPage
      config={{
        title: 'خطط الدروس',
        subtitle: 'جهّز كل درس في صفحة واحدة: أهداف، مراحل زمنية، مواد، ثم اطبعها.',
        kind: 'plan',
        basePath: '/plans',
        createLabel: 'خطة جديدة',
        icon: <IconPlan />,
        items: data.plans,
        onSaveCopy: (d) => savePlan(d as PlanDoc),
        onDelete: (d) => deletePlan(d.id),
        meta: (d) =>
          `مدة الحصة: ${d.durationMinutes ? formatPoints(d.durationMinutes) + ' دقيقة' : 'غير محددة'} · آخر تحديث: ${formatRelative(d.updatedAt)}`,
      }}
    />
  )
}

export function ActivitiesList() {
  const { data, saveActivity, deleteActivity } = useData()
  return (
    <DocListPage
      config={{
        title: 'الأنشطة الصفية',
        subtitle: 'أنشطة وجلسات مبنية على استراتيجيات التفكير أو مصممة يدويًا.',
        kind: 'activity',
        basePath: '/activities',
        createLabel: 'نشاط جديد',
        icon: <IconActivity />,
        items: data.activities,
        onSaveCopy: (d) => saveActivity(d as ActivityDoc),
        onDelete: (d) => deleteActivity(d.id),
        meta: (d) =>
          `${formatPoints(d.steps.length)} خطوات · آخر تحديث: ${formatRelative(d.updatedAt)}`,
      }}
    />
  )
}

export function QuizzesList() {
  const { data, saveQuiz, deleteQuiz } = useData()
  return (
    <DocListPage
      config={{
        title: 'الاختبارات',
        subtitle: 'اسحب أسئلة متنوعة واطبع أوراقًا غير متطابقة مع مفاتيح الإجابة.',
        kind: 'quiz',
        basePath: '/quizzes',
        createLabel: 'اختبار جديد',
        icon: <IconQuiz />,
        items: data.quizzes,
        onSaveCopy: (d) => saveQuiz(d as QuizDoc),
        onDelete: (d) => deleteQuiz(d.id),
        meta: (d) =>
          `${formatPoints(d.questions.length)} سؤال · ${pointsLabel(computeTotalPoints(d.questions))} · آخر تحديث: ${formatRelative(d.updatedAt)}`,
      }}
    />
  )
}
