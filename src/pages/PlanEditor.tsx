import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import type { PlanDoc, PlanSection } from '../lib/types'
import { makeId } from '../lib/id'
import { GRADE_SUGGESTIONS, PLAN_PHASES, SUBJECT_SUGGESTIONS, distributeMinutes, sectionsFromTemplate } from '../lib/planEngine'
import { validatePlan, dropEmptyStrings } from '../lib/validate'
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Textarea } from '../components/UI'
import { StringListEditor } from '../components/StringListEditor'
import { PrintFrame, Paper, PaperHeader, PaperSection, PaperList, printNow, HintBox, SavePdfButton } from '../components/PrintFrame'
import { AttachmentsEditor, PaperAttachments } from '../components/AttachmentsEditor'
import { deleteFileBlobs, deleteRemovedFileBlobs } from '../lib/attachments'
import { formatPoints, formatDateForPrint, formatIsoDateAr } from '../lib/format'
import { IconPlus, IconTrash, IconPrint } from '../components/icons'

// ============ محرر خطة الدرس ============

function emptyPlan(): PlanDoc {
  const now = Date.now()
  return {
    id: makeId(),
    kind: 'plan',
    title: '',
    subject: '',
    grade: '',
    unit: '',
    classDate: '',
    durationMinutes: 45,
    objectives: [''],
    resources: [],
    sections: sectionsFromTemplate(45),
    homework: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function PlanEditor() {
  const { id } = useParams()
  const { data, ready, savePlan, deletePlan } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const existing = id ? data.plans.find((p) => p.id === id) : undefined
  const [form, setForm] = useState<PlanDoc>(existing ?? emptyPlan())
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // انتظار تحميل البيانات المحلية قبل الحكم على «غير موجود»
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
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (id && !existing) {
    return <NotFoundEditor />
  }

  const patch = (p: Partial<PlanDoc>) => setForm((f) => ({ ...f, ...p }))

  const handleSave = () => {
    const doc: PlanDoc = {
      ...form,
      objectives: dropEmptyStrings(form.objectives),
      resources: dropEmptyStrings(form.resources),
      sections: form.sections.filter((s) => s.phase.trim() || s.description.trim()),
    }
    const errs = validatePlan(doc)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast('راجع الحقول المطلوبة قبل الحفظ.', 'error')
      return
    }
    if (existing) void deleteRemovedFileBlobs(existing.attachments, doc.attachments)
    savePlan({ ...doc, updatedAt: Date.now() })
    toast('حُفظت الخطة بنجاح.')
    navigate('/plans')
  }

  const updateSection = (index: number, p: Partial<PlanSection>) => {
    setForm((f) => {
      const sections = [...f.sections]
      sections[index] = { ...sections[index], ...p }
      return { ...f, sections }
    })
  }
  const addSection = () => {
    setForm((f) => ({
      ...f,
      sections: [...f.sections, { phase: '', minutes: 5, description: '' }],
    }))
  }
  const removeSection = (index: number) => {
    setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== index) }))
  }
  const fillTemplate = () => {
    const total = form.durationMinutes ?? 45
    setForm((f) => ({ ...f, sections: sectionsFromTemplate(total) }))
    toast('أُدخِل قالب المراحل وتوزيعُ الزمن تلقائيًا.')
  }
  const redistribute = () => {
    const total = form.durationMinutes ?? 45
    setForm((f) => {
      const dist = distributeMinutes(total)
      const sections: PlanSection[] = f.sections.map((s, i) => ({
        ...s,
        minutes: dist[i % dist.length]?.minutes ?? s.minutes,
      }))
      return { ...f, sections }
    })
    toast('أُعيد توزيع الدقائق على المراحل حسب المدة.')
  }

  return (
    <>
      <PageHeader
        title={form.title || 'خطة درس جديدة'}
        subtitle="املأ الحقول، واطبع ورقة الخطة مباشرة من أسفل الصفحة."
        actions={
          <>
            <Button variant="outline" onClick={printNow}>
              <IconPrint className="h-4 w-4" /> طباعة الخطة
            </Button>
            <SavePdfButton label="حفظ الخطة PDF" />
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
        {/* النموذج */}
        <div className="space-y-4 xl:col-span-2">
          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان الدرس" htmlFor="plan-title" required error={errors.title} className="sm:col-span-2">
                <Input
                  id="plan-title"
                  value={form.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="مثال: أثر الضوء في نمو النبات"
                />
              </Field>
              <Field label="المادة" htmlFor="plan-subject" required error={errors.subject}>
                <Input
                  id="plan-subject"
                  list="dl-subjects"
                  value={form.subject}
                  onChange={(e) => patch({ subject: e.target.value })}
                  placeholder="اختر أو اكتب"
                />
                <DataList id="dl-subjects" options={SUBJECT_SUGGESTIONS} />
              </Field>
              <Field label="الصف" htmlFor="plan-grade">
                <Input id="plan-grade" list="dl-grades" value={form.grade} onChange={(e) => patch({ grade: e.target.value })} placeholder="اختر أو اكتب" />
                <DataList id="dl-grades" options={GRADE_SUGGESTIONS} />
              </Field>
              <Field label="الوحدة / الموضوع" htmlFor="plan-unit">
                <Input id="plan-unit" value={form.unit ?? ''} onChange={(e) => patch({ unit: e.target.value })} />
              </Field>
              <Field
                label="تاريخ الحصة"
                htmlFor="plan-date"
                hint={form.classDate ? `يقابل: ${formatIsoDateAr(form.classDate)}` : 'اختر اليوم من تقويم المتصفح'}
              >
                <Input
                  id="plan-date"
                  type="date"
                  dir="ltr"
                  value={form.classDate ?? ''}
                  onChange={(e) => patch({ classDate: e.target.value })}
                />
              </Field>
              <Field label="مدة الحصة (دقيقة)" htmlFor="plan-duration" error={errors.durationMinutes}>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  max={300}
                  value={form.durationMinutes ?? ''}
                  onChange={(e) => patch({ durationMinutes: e.target.value === '' ? undefined : Math.max(1, Math.round(Number(e.target.value))) })}
                />
                <HintBox>سيُستخدم في توزيع الدقائق على المراحل</HintBox>
              </Field>
            </div>
          </Card>

          <Card>
            <StringListEditor
              label="أهداف الدرس (نتاجات التعلم)"
              items={form.objectives}
              onChange={(objectives) => patch({ objectives })}
              placeholder="مثال: يُحدِّد الطالب ثلاثة أسباب لنتيب النبات"
              textarea
              addLabel="إضافة هدف"
              itemNoun="هدف"
              error={errors.objectives}
            />
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">مراحل الدرس</span>
              <div className="flex gap-2">
                <Button variant="subtle" size="sm" onClick={fillTemplate}>
                  <IconPlus className="h-4 w-4" /> عبّي من القالب (5E)
                </Button>
                <Button variant="outline" size="sm" onClick={redistribute}>
                  إعادة توزيع الدقائق
                </Button>
                <Button variant="outline" size="sm" onClick={addSection}>
                  <IconPlus className="h-4 w-4" /> مرحلة
                </Button>
              </div>
            </div>
            {errors.sections && (
              <p role="alert" className="mb-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.sections}
              </p>
            )}
            <ul className="space-y-3">
              {form.sections.map((s, i) => (
                <li key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[1fr_84px]">
                  <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
                    <Input
                      list="dl-phases"
                      value={s.phase}
                      onChange={(e) => updateSection(i, { phase: e.target.value })}
                      placeholder="اسم المرحلة"
                      aria-label={`اسم المرحلة ${i + 1}`}
                    />
                    <Input
                      value={s.description}
                      onChange={(e) => updateSection(i, { description: e.target.value })}
                      placeholder="وصف الخطوات في هذه المرحلة"
                      aria-label={`وصف المرحلة ${i + 1}`}
                    />
                    <DataList id="dl-phases" options={[...PLAN_PHASES]} />
                  </div>
                  <div className="flex items-start gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={600}
                      value={s.minutes}
                      onChange={(e) => updateSection(i, { minutes: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                      aria-label={`دقائق المرحلة ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      onClick={() => removeSection(i)}
                      aria-label={`حذف مرحلة ${i + 1}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              مجموع الدقائق حاليًا: {formatPoints(form.sections.reduce((m, s) => m + (Number(s.minutes) || 0), 0))} — المقترح: {' '}
              {(form.durationMinutes ?? 45).toLocaleString('ar-EG-u-nu-latn')}
            </p>
          </Card>

          <Card>
            <StringListEditor label="المواد والأدوات" items={form.resources} onChange={(resources) => patch({ resources })} placeholder="مثال: حاسوب وأوراق شراب" addLabel="إضافة مادة" itemNoun="مادة" />
          </Card>

          <Card>
            <AttachmentsEditor value={form.attachments ?? []} onChange={(attachments) => patch({ attachments })} />
          </Card>

          <Card className="space-y-4">
            <Field label="الواجب المنزلي" htmlFor="plan-homework">
              <Textarea id="plan-homework" value={form.homework ?? ''} onChange={(e) => patch({ homework: e.target.value })} />
            </Field>
            <Field label="ملاحظات للمعلم (لا تُطبع)" htmlFor="plan-notes">
              <Textarea id="plan-notes" value={form.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} />
              <HintBox >تُحفظ محليًا فقط ولا تظهر في الورقة المطبوعة</HintBox>
            </Field>
          </Card>
        </div>

        {/* معاينة مبسطّة */}
        <aside className="xl:col-span-1" aria-label="معاينة الخطة">
          <Card className="sticky top-24 text-sm">
            <h2 className="mb-3 font-bold text-slate-800 dark:text-slate-100">معاينة سريعة</h2>
            <p className="mb-1 font-semibold text-brand-800 dark:text-brand-200">{form.title || '(بلا عنوان)'}</p>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {form.subject} {form.grade ? `· ${form.grade}` : ''} · {form.durationMinutes ?? '—'} دقيقة
            </p>
            <ul className="list-decimal space-y-1 ps-5 text-xs text-slate-600 dark:text-slate-300">
              {form.objectives.filter(Boolean).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              النسخة الكاملة الجاهزة للطباعة تُنشَأ أسفل الصفحة — اطبعها بزر «طباعة الخطة».
            </p>
          </Card>
        </aside>
      </div>

      {/* طبقة الطباعة */}
      <PrintFrame>
        <Paper>
          <PlanPaper doc={form} profile={data.settings.profile} />
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
            deletePlan(existing.id)
          }
          toast('حُذفت الخطة.')
          navigate('/plans')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

function NotFoundEditor() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">العنصر غير موجود</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">ربما حُذفت أو الرابط قديم.</p>
      <Link to="/plans" className="text-brand-700 underline underline-offset-2 dark:text-brand-300">
        رجوع إلى القائمة
      </Link>
    </div>
  )
}

function DataList({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  )
}

export function PlanPaper({ doc, profile }: { doc: PlanDoc; profile: { name: string; school: string; semester: string } }) {
  return (
    <>
      <PaperHeader
        school={profile.school}
        teacher={profile.name}
        semester={profile.semester}
        title={`خطة درس: ${doc.title || '……'}`}
        meta={`المادة: ${doc.subject || '……'} · الصف: ${doc.grade || '……'} · تاريخ الحصة: ${formatDateForPrint(doc.classDate)} · المدة: ${doc.durationMinutes ?? '…'} دقيقة`}
      />
      {doc.unit && <p className="paper-line">الوحدة: {doc.unit}</p>}
      <PaperSection title="أهداف الدرس">
        <PaperList items={doc.objectives.filter(Boolean)} ordered />
      </PaperSection>
      <PaperSection title="مراحل الدرس">
        <table className="paper-table">
          <thead>
            <tr>
              <th className="w-28">المرحلة</th>
              <th className="w-16">الدقائق</th>
              <th>الخطوات</th>
            </tr>
          </thead>
          <tbody>
            {doc.sections.filter((s) => s.phase.trim() || s.description.trim()).map((s, i) => (
              <tr key={i}>
                <td>{s.phase || '—'}</td>
                <td>{s.minutes}</td>
                <td>{s.description}</td>
              </tr>
            ))}
            {doc.sections.filter((s) => s.phase.trim() || s.description.trim()).length === 0 && (
              <tr>
                <td colSpan={3}>—</td>
              </tr>
            )}
          </tbody>
        </table>
      </PaperSection>
      <PaperSection title="المواد والأدوات">
        <PaperList items={doc.resources.filter(Boolean)} />
      </PaperSection>
      <PaperSection title="الواجب المنزلي">
        <p className="paper-line">{doc.homework || '—'}</p>
      </PaperSection>
      <PaperAttachments attachments={doc.attachments} />
      <div className="paper-sign">
        <span>توقيع المعلم: …………</span>
        <span>توقيع المشرف: …………</span>
      </div>
    </>
  )
}
