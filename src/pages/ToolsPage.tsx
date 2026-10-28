import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/UI'
import { WeeklyPlanner } from '../components/WeeklyPlanner'
import { ClassTimer } from '../components/ClassTimer'
import { Insights } from '../components/Insights'
import { cn } from '../lib/cn'

// ============ صفحة أدوات الصف ============
// ثلاث أدوات تُستخدم داخل الحصة أو قبيلها:
// المفكرة الأسبوعية (تنظيم الأيام)، المؤقت الصفي (عرض الخطوات بزمن حقيقي)، المؤشرات (قراءة في البيانات).

const TABS = [
  { key: 'weekly', label: 'المفكرة الأسبوعية' },
  { key: 'timer', label: 'المؤقت الصفي' },
  { key: 'insights', label: 'المؤشرات' },
] as const

type TabKey = (typeof TABS)[number]['key']

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v)
}

export function ToolsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = isTabKey(raw) ? raw : 'weekly'

  const selectTab = (key: TabKey) => setParams({ tab: key })

  return (
    <div>
      <PageHeader
        title="أدوات الصف"
        subtitle="أدوات تُستخدم في الحصة لا في المكتب فقط: نظّم أسبوعك، شغّل توقيت النشاط، واقرأ بياناتك."
      />

      <div
        role="tablist"
        aria-label="تبويبات أدوات الصف"
        className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card dark:border-slate-700 dark:bg-slate-800 sm:w-fit"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => selectTab(t.key)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:flex-none',
              tab === t.key
                ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'weekly' && <WeeklyPlanner />}
        {tab === 'timer' && <ClassTimer />}
        {tab === 'insights' && <Insights />}
      </div>
    </div>
  )
}

export default ToolsPage
