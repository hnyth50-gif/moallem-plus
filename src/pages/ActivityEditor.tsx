import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import type { ActivityDoc, ActivityStep } from '../lib/types'
import { makeId } from '../lib/id'
import { BUILTIN_CARDS, CATEGORY_LABELS, CATEGORY_COLORS } from '../lib/strategies'
import { cardById } from '../lib/lookup'
import { validateActivity, dropEmptyStrings } from '../lib/validate'
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Textarea, Badge, Spinner } from '../components/UI'
import { StringListEditor } from '../components/StringListEditor'
import { PrintFrame, Paper, PaperHeader, PaperSection, PaperList, printNow, SavePdfButton } from '../components/PrintFrame'
import { AttachmentsEditor, PaperAttachments } from '../components/AttachmentsEditor'
import { deleteFileBlobs } from '../lib/attachments'
import { IconPlus, IconTrash, IconPrint, IconClock } from '../components/icons'
import { formatPoints } from '../lib/format'
import { GRADE_SUGGESTIONS, SUBJECT_SUGGESTIONS } from '../lib/planEngine'

// ============ محرر النشاط ============
// نشاط فردي/تعاوني مبني على استراتيجية من المكتبة أو مخصص بالكامل.

function emptyActivity(): ActivityDoc {
  const now = Date.now()
  return {
    id: makeId(),
    kind: 'activity',
    title: '',
    subject: '',
    grade: '',
    goal: '',
    strategyId: '',
    materials: [],
    steps: [{ text: '', minutes: 5 }],
    grouping: '',
    assessment: '',
    outcome: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function ActivityEditor() {
  const { id } = useParams()
  const { data, ready, saveActivity, deleteActivity } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const existing = id ? data.activities.find((a) => a.id === id) : undefined
  const [form, setForm] = useState<ActivityDoc>(existing ?? emptyActivity())
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!initialized && existing && existing.id !== form.id) {
      setForm(existing)
      setInitialized(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, existing?.id])

  if (!ready) {
    return (
      <div className="flex justify-center py-20" role="status">
        <Spinner />
      </div>
    )
  }
  if (id && !existing) {
    return <NotFoundLink label="نشاط" back="/activities" />
  }

  const patch = (p: Partial<ActivityDoc>) => setForm((f) => ({ ...f, ...p }))

  const updateStep = (index: number, p: Partial<ActivityStep>) => {
    setForm((f) => {
      const steps = [...f.steps]
      steps[index] = { ...steps[index], ...p }
      return { ...f, steps }
    })
  }

  const handleSave = () => {
    const doc: ActivityDoc = {
      ...form,
      goal: form.goal.trim(),
      materials: dropEmptyStrings(form.materials),
      steps: form.steps.filter((s) => s.text.trim()).map((s) => ({ ...s, minutes: s.minutes && s.minutes > 0 ? s.minutes : undefined })),
    }
    const errs = validateActivity(doc)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast('راجع الحقول المطلوبة قبل الحفظ.', 'error')
      return
    }
    saveActivity({ ...doc, updatedAt: Date.now() })
    toast('حُفظ النشاط بنجاح.')
    navigate('/activities')
  }

  const strategy = form.strategyId ? cardById(form.strategyId, data.customCards) : undefined

  return (
    <>
      <PageHeader
        title={form.title || 'نشاط جديد'}
        subtitle="اختر استراتيجية من المكتبة أو صمّم خطواتك بنفسك، ثم اطبع ورقة النشاط."
        actions={
          <>
            {existing && (
              <Button
                variant="outline"
                onClick={() => navigate(`/tools?tab=timer&activity=${existing.id}`)}
                title="شغّل خطوات النشاط بمؤقت حقيقي أمام الصف"
              >
                <IconClock className="h-4 w-4" /> تشغيل الخطوات
              </Button>
            )}
            <Button variant="outline" onClick={printNow}>
              <IconPrint className="h-4 w-4" /> طباعة
            </Button>
            <SavePdfButton />
            <Button onClick={handleSave}>حفظ</Button>
            {existing && (
              <Button variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => setConfirmDelete(true)}>
                حذف
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="grid gap-4 sm:grid-cols-2">
            <Field label="عنوان النشاط" htmlFor="act-title" required error={errors.title} className="sm:col-span-2">
              <Input id="act-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="مثال: حلقات الاستخلاص السريع" />
            </Field>
            <Field label="المادة" htmlFor="act-subject" required error={errors.subject}>
              <Input id="act-subject" list="dl-subjects" value={form.subject} onChange={(e) => patch({ subject: e.target.value })} />
              <datalist id="dl-subjects">
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="الصف" htmlFor="act-grade">
              <Input id="act-grade" list="dl-grades" value={form.grade} onChange={(e) => patch({ grade: e.target.value })} />
              <datalist id="dl-grades">
                {GRADE_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field label="الهدف من النشاط" htmlFor="act-goal" required error={errors.goal} className="sm:col-span-2">
              <Textarea id="act-goal" value={form.goal} onChange={(e) => patch({ goal: e.target.value })} placeholder="ما الذي سيتمكن الطلاب من فعله بعد هذا النشاط؟" />
            </Field>
          </Card>

          <Card>
            <Field label="مربوطة بخطّة استراتيجية (اختياري)" htmlFor="act-strategy">
              <select
                id="act-strategy"
                value={form.strategyId ?? ''}
                onChange={(e) => patch({ strategyId: e.target.value || undefined })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">بدون استراتيجية — تصميم حر</option>
                <optgroup label="من مكتبة البطاقات">
                  {BUILTIN_CARDS.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </optgroup>
                {data.customCards.length > 0 && (
                  <optgroup label="بطاقاتي الخاصة">
                    {data.customCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>
            {strategy && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-1 flex items-center gap-2">
                  <Badge className={CATEGORY_COLORS[strategy.category]}>{CATEGORY_LABELS[strategy.category]}</Badge>
                  <strong className="text-slate-800 dark:text-slate-100">{strategy.title}</strong>
                  <Link to={`/cards/${strategy.id}`} className="ms-auto text-xs text-brand-700 underline dark:text-brand-300">
                    تفاصيل البطاقة
                  </Link>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{strategy.brief}</p>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">خطوات التنفيذ</span>
              <Button variant="outline" size="sm" onClick={() => patch({ steps: [...form.steps, { text: '', minutes: 5 }] })}>
                <IconPlus className="h-4 w-4" /> خطوة
              </Button>
            </div>
            <ul className="space-y-2">
              {form.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 rounded-md bg-slate-100 px-1.5 text-center text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300" aria-hidden="true">
                    {i + 1}
                  </span>
                  <Input
                    value={s.text}
                    onChange={(e) => updateStep(i, { text: e.target.value })}
                    placeholder={`نص الخطوة ${i + 1}`}
                    aria-label={`نص الخطوة ${i + 1}`}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={s.minutes ?? ''}
                    onChange={(e) => updateStep(i, { minutes: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
                    aria-label={`دقائق الخطوة ${i + 1}`}
                    placeholder="د"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    onClick={() => patch({ steps: form.steps.filter((_, j) => j !== i) })}
                    aria-label={`حذف الخطوة ${i + 1}`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <StringListEditor label="الأدوات والمواد" items={form.materials} onChange={(materials) => patch({ materials })} placeholder="مثال: بطاقات ملونة" addLabel="إضافة أداة" itemNoun="أداة" />
          </Card>

          <Card>
            <AttachmentsEditor value={form.attachments ?? []} onChange={(attachments) => patch({ attachments })} />
          </Card>

          <Card className="grid gap-4 sm:grid-cols-2">
            <Field label="نمط التجميع" htmlFor="act-grouping" hint="فردي، ثنائي، مجموعات، صف كامل…">
              <Input id="act-grouping" value={form.grouping ?? ''} onChange={(e) => patch({ grouping: e.target.value })} />
            </Field>
            <Field label="التقويم" htmlFor="act-assessment" hint="كيف ستقيس نجاح الطلاب في هذا النشاط؟">
              <Input id="act-assessment" value={form.assessment ?? ''} onChange={(e) => patch({ assessment: e.target.value })} />
            </Field>
            <Field label="الناتج المتوقع" htmlFor="act-outcome" className="sm:col-span-2">
              <Input id="act-outcome" value={form.outcome ?? ''} onChange={(e) => patch({ outcome: e.target.value })} />
            </Field>
            <Field label="ملاحظات (لا تُطبع)" htmlFor="act-notes" className="sm:col-span-2">
              <Textarea id="act-notes" value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} />
            </Field>
          </Card>
        </div>

        <aside className="xl:col-span-1">
          <Card className="sticky top-24 text-sm">
            <h2 className="mb-3 font-bold text-slate-800 dark:text-slate-100">معاينة سريعة</h2>
            <p className="mb-2 font-semibold text-brand-800 dark:text-brand-200">{form.title || '(بلا عنوان)'}</p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{form.goal || '—" "الهدف لم يُكتب بعد.'}</p>
            <ul className="mt-3 list-decimal space-y-1 ps-5 text-xs text-slate-600 dark:text-slate-300">
              {form.steps.filter((s) => s.text.trim()).map((s, i) => (
                <li key={i}>{s.text}</li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <PrintFrame>
        <Paper>
          <PaperHeader
            school={data.settings.profile.school}
            teacher={data.settings.profile.name}
            semester={data.settings.profile.semester}
            title={`ورقة نشاط: ${form.title || '……'}`}
            meta={`المادة: ${form.subject || '……'} · الصف: ${form.grade || '……'}${strategy ? ` · استراتيجية: ${strategy.title}` : ''}`}
          />
          <PaperSection title="الهدف">
            <p className="paper-line">{form.goal || '—'}</p>
          </PaperSection>
          <PaperSection title="خطوات التنفيذ">
            <table className="paper-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>الخطوة</th>
                  <th className="w-16">الزمن</th>
                </tr>
              </thead>
              <tbody>
                {form.steps.filter((s) => s.text.trim()).map((s, i) => (
                  <tr key={i}>
                    <td>{formatPoints(i)}</td>
                    <td>{s.text}</td>
                    <td>{s.minutes ? `${formatPoints(s.minutes)} د` : '—'}</td>
                  </tr>
                ))}
                {form.steps.filter((s) => s.text.trim()).length === 0 && (
                  <tr>
                    <td colSpan={3}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </PaperSection>
          <PaperSection title="الأدوات والمواد">
            <PaperList items={form.materials} />
          </PaperSection>
          <PaperAttachments attachments={form.attachments} />
          {form.grouping && <PaperSection title="نمط التجميع"><p className="paper-line">{form.grouping}</p></PaperSection>}
          {form.assessment && <PaperSection title="التقويم"><p className="paper-line">{form.assessment}</p></PaperSection>}
          {form.outcome && <PaperSection title="الناتج المتوقع"><p className="paper-line">{form.outcome}</p></PaperSection>}
        </Paper>
      </PrintFrame>

      <ConfirmDialog
        open={confirmDelete}
        title="تأكيد الحذف"
        message={`سيُحذف «${form.title}» نهائيًا من هذا الجهاز.`}
        confirmLabel="حذف نهائي"
        danger
        onConfirm={() => {
          if (existing) {
            void deleteFileBlobs(existing.attachments)
            deleteActivity(existing.id)
          }
          toast('حُذف النشاط.')
          navigate('/activities')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

export function NotFoundLink({ label, back }: { label: string; back: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{label} غير موجود</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">ربما حُذفت أو الرابط قديم.</p>
      <Link to={back} className="text-brand-700 underline underline-offset-2 dark:text-brand-300">
        رجوع إلى القائمة
      </Link>
    </div>
  )
}
