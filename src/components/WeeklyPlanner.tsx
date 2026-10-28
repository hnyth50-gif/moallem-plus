import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WeekEntry, WeekEntryKind } from '../lib/types'
import { useData, newDoc } from '../state/DataContext'
import { validateWeekEntry } from '../lib/validate'
import { KIND_BADGE_CLASS } from './DocListPage'
import { Button, Card, ConfirmDialog, Field, Input, Select } from './UI'
import { IconCheck, IconClose, IconEdit, IconPlus, IconTrash } from './icons'
import { cn } from '../lib/cn'

// ============ المفكرة الأسبوعية ============
// شبكة الأيام الدراسية: تربط كل يوم بمهام حرة أو بمستندات جاهزة (خطة/نشاط/اختبار)
// فينسخ المعلم مونتاجه الأسبوعي بضغطة، وينتقل إلى أي عنصر بنقرة واحدة.

export const WEEK_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

const KIND_META: Record<WeekEntryKind, { label: string; basePath: string | null }> = {
  plan: { label: 'خطة', basePath: '/plans' },
  activity: { label: 'نشاط', basePath: '/activities' },
  quiz: { label: 'اختبار', basePath: '/quizzes' },
  note: { label: 'مهمة', basePath: null },
}

interface FormState {
  title: string
  period: string
  kind: WeekEntryKind
  refId: string
}

const EMPTY_FORM: FormState = { title: '', period: '', kind: 'note', refId: '' }

export function WeeklyPlanner() {
  const { data, saveWeekEntry, deleteWeekEntry, clearWeekEntries } = useData()
  const navigate = useNavigate()

  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ title?: string; refId?: string }>({})
  const [confirmClear, setConfirmClear] = useState(false)

  const entries = data.weekEntries ?? []
  const byDay = (day: number) => entries.filter((e) => e.day === day)
  const openCount = entries.length

  const startAdd = (day: number) => {
    setAddingDay(day)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const startEdit = (entry: WeekEntry) => {
    setAddingDay(entry.day)
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      period: entry.period ?? '',
      kind: entry.kind,
      refId: entry.refId ?? '',
    })
    setErrors({})
  }

  const closeForm = () => {
    setAddingDay(null)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const submit = () => {
    const candidate: WeekEntry = {
      id: editingId ?? '',
      kind: form.kind,
      day: addingDay ?? 0,
      title: form.title.trim(),
      period: form.period.trim() || undefined,
      refId: form.kind === 'note' ? undefined : form.refId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    // عند التعديل نحافظ على معرّف ووقت الإنشاء الأصليين
    const existing = editingId ? entries.find((e) => e.id === editingId) : undefined
    const doc: WeekEntry = existing
      ? { ...candidate, id: existing.id, createdAt: existing.createdAt, updatedAt: Date.now() }
      : newDoc((id, createdAt, updatedAt) => ({ ...candidate, id, createdAt, updatedAt }))

    const errs = validateWeekEntry(doc)
    if (Object.keys(errs).length > 0) {
      setErrors({ title: errs.title, refId: errs.refId })
      return
    }
    saveWeekEntry(doc)
    closeForm()
  }

  const pickDoc = (kind: WeekEntryKind, refId: string) => {
    // عند اختيار مستند نملأ العنوان تلقائيًا من عنوانه
    const lists: Record<string, { id: string; title: string }[]> = {
      plan: data.plans,
      activity: data.activities,
      quiz: data.quizzes,
      note: [],
    }
    const doc = lists[kind].find((d) => d.id === refId)
    setForm((f) => ({ ...f, kind, refId, title: doc ? doc.title : f.title }))
  }

  const openEntry = (entry: WeekEntry) => {
    const meta = KIND_META[entry.kind]
    if (meta.basePath && entry.refId) navigate(`${meta.basePath}/${entry.refId}`)
  }

  const docOptions = (kind: WeekEntryKind) => {
    if (kind === 'plan') return data.plans.map((d) => ({ id: d.id, title: d.title }))
    if (kind === 'activity') return data.activities.map((d) => ({ id: d.id, title: d.title }))
    if (kind === 'quiz') return data.quizzes.map((d) => ({ id: d.id, title: d.title }))
    return []
  }

  const renderForm = (day: number) => {
    if (addingDay !== day) return null
    const options = docOptions(form.kind)
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-800 dark:bg-brand-900/20">
        <Field label="عنوان المهمة" htmlFor={`week-title-${day}`} required error={errors.title}>
          <Input
            id={`week-title-${day}`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثال: الحصة الأولى — درس النسب"
            autoFocus
          />
        </Field>
        <Field label="الحصة أو الوقت" htmlFor={`week-period-${day}`} hint="اختياري">
          <Input
            id={`week-period-${day}`}
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
            placeholder="مثال: الحصة الثالثة"
          />
        </Field>
        <Field label="النوع" htmlFor={`week-kind-${day}`}>
          <Select
            id={`week-kind-${day}`}
            value={form.kind}
            onChange={(e) => {
              const kind = e.target.value as WeekEntryKind
              setForm((f) => ({ ...f, kind, refId: kind === 'note' ? '' : f.refId }))
            }}
          >
            <option value="note">مهمة حرة</option>
            <option value="plan">خطة درس</option>
            <option value="activity">نشاط</option>
            <option value="quiz">اختبار</option>
          </Select>
        </Field>
        {form.kind !== 'note' && (
          <Field label="العنصر المرتبط" htmlFor={`week-ref-${day}`} error={errors.refId} required>
            <Select
              id={`week-ref-${day}`}
              value={form.refId}
              onChange={(e) => pickDoc(form.kind, e.target.value)}
            >
              <option value="">— اختر —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={submit}>
            <IconCheck /> {editingId ? 'حفظ التعديل' : 'إضافة'}
          </Button>
          <Button size="sm" variant="ghost" onClick={closeForm}>
            إلغاء
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {openCount > 0 ? `${openCount === 1 ? 'مهمة واحدة' : `${openCount} مهام`} هذا الأسبوع` : 'انسَ الورق — رتّب أسبوعك هنا'}
        </p>
        {openCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => setConfirmClear(true)}>
            <IconTrash /> تفريغ الأسبوع
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" role="list" aria-label="أيام الأسبوع">
        {WEEK_DAYS.map((dayName, day) => {
          const items = byDay(day)
          return (
            <Card key={day} className="flex flex-col p-3" >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{dayName}</h3>
                <button
                  type="button"
                  onClick={() => (addingDay === day && !editingId ? closeForm() : startAdd(day))}
                  aria-label={`إضافة مهمة في يوم ${dayName}`}
                  className="rounded-lg p-1.5 text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                >
                  {addingDay === day && !editingId ? <IconClose /> : <IconPlus />}
                </button>
              </div>

              {renderForm(day)}

              <div className="mt-2 flex-1 space-y-2" role="presentation">
                {items.length === 0 && addingDay !== day && (
                  <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    لا مهام
                  </p>
                )}
                {items.map((entry) => {
                  const meta = KIND_META[entry.kind]
                  const clickable = Boolean(meta.basePath && entry.refId)
                  return (
                    <div
                      key={entry.id}
                      role={clickable ? 'button' : undefined}
                      className={cn(
                        'group relative rounded-xl border border-slate-200 bg-white p-2.5 text-start dark:border-slate-700 dark:bg-slate-800/60',
                        clickable && 'cursor-pointer transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:border-brand-700 dark:hover:bg-brand-900/20',
                      )}
                      onClick={() => clickable && openEntry(entry)}
                      onKeyDown={(e) => {
                        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          openEntry(entry)
                        }
                      }}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={clickable ? `${meta.label}: ${entry.title} — فتح` : undefined}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
                            entry.kind === 'note'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              : KIND_BADGE_CLASS[entry.kind],
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEdit(entry)
                            }}
                            aria-label={`تعديل ${entry.title}`}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteWeekEntry(entry.id)
                            }}
                            aria-label={`حذف ${entry.title}`}
                            className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                          >
                            <IconTrash />
                          </button>
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">
                        {entry.title}
                        {entry.demo && (
                          <span className="ms-1.5 inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            تجريبي
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {[entry.period, clickable ? 'انقر للفتح' : null].filter(Boolean).join(' · ')}
                      </p>
                      {editingId === entry.id && <span className="sr-only">قيد التعديل</span>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="تفريغ المفكرة الأسبوعية"
        message="سيُحذف كل ما في الأسبوع (المهام والروابط). لا يمكن التراجع."
        confirmLabel="تفريغ"
        danger
        onConfirm={() => {
          clearWeekEntries()
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

export default WeeklyPlanner
