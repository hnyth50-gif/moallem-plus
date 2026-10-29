import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityDoc, Attachment, PlanDoc, QuizDoc, ThinkingCard } from '../lib/types'
import { sortByUpdated, matchesQuery, sortAlphabetically, type Doc } from '../lib/store'
import { deleteFileBlobs, cloneAttachments } from '../lib/attachments'
import { formatRelative } from '../lib/format'
import { Badge, Button, Card, EmptyState, Input, Select, DemoBadge, PageHeader } from './UI'
import { IconPlan, IconActivity, IconQuiz, IconSearch, IconPlus, IconCopy, IconTrash, IconEdit } from './icons'
import { useToast } from '../state/ToastContext'
import { ConfirmDialog } from './UI'

// ============ قوائم المستندات المشتركة ============
// نمط موحّد: بحث + مرشحات (مادة/سلّم) + ترتيب + شبيكة بطاقات + إجراءات (تحرير/نسخ/حذف).

type ListBase = {
  id: string
  title: string
  subject: string
  grade: string
  demo?: boolean
  attachments?: Attachment[]
  createdAt: number
  updatedAt: number
}

export interface DocListConfig<T extends ListBase> {
  title: string
  subtitle: string
  kind: 'plan' | 'activity' | 'quiz'
  basePath: string
  createLabel: string
  icon: ReactNode
  items: T[]
  onSaveCopy: (doc: T) => void
  onDelete: (doc: T) => void
  meta: (doc: T) => ReactNode
}

export function DocListPage<T extends ListBase>({ config }: { config: DocListConfig<T> }) {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent')
  const [pendingDelete, setPendingDelete] = useState<T | null>(null)

  const subjects = useMemo(
    () => [...new Set(config.items.map((d) => d.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')),
    [config.items],
  )
  const grades = useMemo(() => [...new Set(config.items.map((d) => d.grade).filter(Boolean))], [config.items])

  const filtered = useMemo(() => {
    const list = config.items.filter(
      (d) =>
        (!subject || d.subject === subject) &&
        (!grade || d.grade === grade) &&
        matchesQuery(d, query, ['title', 'subject', 'grade']),
    )
    return sort === 'alpha' ? sortAlphabetically(list) : sortByUpdated(list)
  }, [config.items, subject, grade, sort, query])

  const handleCopy = (doc: T) => {
    void (async () => {
      // النسخة مستقل تمامًا: مرفقات بمعرفات جديدة وكتل ملفات منقولة
      const attachments = await cloneAttachments(doc.attachments)
      const copy = {
        ...doc,
        id: `copy-${doc.id.slice(0, 8)}-${Date.now()}`,
        title: `${doc.title} — نسخة`,
        demo: undefined,
        attachments,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      config.onSaveCopy(copy)
      toast('نُسخ العنصر وفُتح محرر النسخة الجديدة.')
    })()
  }

  const hasAny = config.items.length > 0
  const noResults = hasAny && filtered.length === 0

  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Link to={`${config.basePath}/new`}>
            <Button variant="primary">
              <IconPlus className="h-4 w-4" /> {config.createLabel}
            </Button>
          </Link>
        }
      />

      {hasAny && (
        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="search">
          <div className="relative">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في العناوين…"
              aria-label="بحث"
              className="pe-9"
            />
            <IconSearch className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="تصفية حسب المادة">
            <option value="">كل المواد</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="تصفية حسب السلّم">
            <option value="">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'alpha')} aria-label="ترتيب النتائج">
            <option value="recent">الأحدث تحديثًا</option>
            <option value="alpha">أبجديًا</option>
          </Select>
        </div>
      )}

      {!hasAny ? (
        <EmptyState
          icon={config.icon}
          title="لا يوجد عناصر بعد"
          description={config.subtitle}
          action={
            <Link to={`${config.basePath}/new`}>
              <Button variant="primary">
                <IconPlus className="h-4 w-4" /> {config.createLabel}
              </Button>
            </Link>
          }
        />
      ) : noResults ? (
        <EmptyState
          icon={<IconSearch />}
          title="لا نتائج مطابقة"
          description="جرّب تعديل كلمات البحث أو إزالة المرشحات."
          action={
            <Button variant="outline" onClick={() => { setQuery(''); setSubject(''); setGrade('') }}>
              إزالة المرشحات
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="قائمة العناصر">
          {filtered.map((doc) => (
            <li key={doc.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`${config.basePath}/${doc.id}`}
                    className="text-base font-bold text-slate-900 underline-offset-2 hover:underline dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 rounded-lg"
                  >
                    {doc.title}
                  </Link>
                  {doc.demo && <DemoBadge />}
                </div>
                <div className="flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex flex-wrap gap-1.5">
                    {doc.subject && <Badge>{doc.subject}</Badge>}
                    {doc.grade && <Badge>{doc.grade}</Badge>}
                  </div>
                  <p>{config.meta(doc)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelative(doc.updatedAt)}</span>
                  <div className="flex gap-1">
                    <Link to={`${config.basePath}/${doc.id}`} aria-label={`تحرير ${doc.title}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
                      <IconEdit />
                    </Link>
                    <Button variant="ghost" size="icon" className="rounded-lg text-slate-500 dark:text-slate-400" onClick={() => handleCopy(doc)} aria-label={`نسخ ${doc.title}`} title="نسخة جديدة">
                      <IconCopy />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => setPendingDelete(doc)} aria-label={`حذف ${doc.title}`} title="حذف">
                      <IconTrash />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="تأكيد الحذف"
        message={`هل تريد حذف «${pendingDelete?.title ?? ''}» نهائيًا؟ لا يمكن التراجع بعد الحذف المحلي.`}
        confirmLabel="حذف نهائي"
        danger
        onConfirm={() => {
          if (pendingDelete) {
            void deleteFileBlobs(pendingDelete.attachments)
            config.onDelete(pendingDelete)
          }
          toast('تم الحذف.')
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

export function DocIcon({ kind }: { kind: Doc['kind'] }) {
  return kind === 'plan' ? <IconPlan /> : kind === 'activity' ? <IconActivity /> : <IconQuiz />
}

export const KIND_LABEL: Record<Doc['kind'], string> = {
  plan: 'خطة درس',
  activity: 'نشاط',
  quiz: 'اختبار',
}

/** ألوان شارات الأنواع — مصدر واحد تستخدمه كل الصفحات للتناسق */
export const KIND_BADGE_CLASS: Record<Doc['kind'], string> = {
  plan: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  activity: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  quiz: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
}

/** شارة نوع المستند (خطة/نشاط/اختبار) بشكل موحد */
export function DocKindBadge({ kind, label }: { kind: Doc['kind']; label?: string }) {
  return <Badge className={KIND_BADGE_CLASS[kind]}>{label ?? KIND_LABEL[kind]}</Badge>
}

export function DemoListTools({ demoCount, onRemove, onLoad }: { demoCount: number; onRemove: () => void; onLoad?: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
      {demoCount > 0 && (
        <>
          <span>يوجد {demoCount} عنصر تجريبي.</span>
          <Button variant="outline" size="sm" onClick={onRemove}>إزالة العناصر التجريبية</Button>
        </>
      )}
      {!demoCount && onLoad && (
        <Button variant="subtle" size="sm" onClick={onLoad}>
          تجربة ببيانات تجريبية
        </Button>
      )}
    </div>
  )
}

/** نموذج دفعة قائمة معربة للطباعة — PlanDoc وActivityDoc وQuizDoc وThinkingCard */
export type AnyDoc = PlanDoc | ActivityDoc | QuizDoc | ThinkingCard
