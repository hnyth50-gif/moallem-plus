import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import type { CertificateDoc, CertificateType } from '../lib/types'
import { makeId } from '../lib/id'
import { validateCertificate } from '../lib/validate'
import { CERT_TYPE_META, CERT_TYPES } from '../lib/certificates'
import { GRADE_SUGGESTIONS } from '../lib/planEngine'
import { formatDate } from '../lib/format'
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Select, Spinner, Textarea, Badge } from '../components/UI'
import { NotFoundLink } from './ActivityEditor'
import { PrintFrame, printNow, SavePdfButton } from '../components/PrintFrame'
import { IconPrint } from '../components/icons'

// ============ محرر شهادة طالب ============
// شهادة شكر وتقدير / تفوق / تحفيز باسم الطالب، بمعاينة حية
// وطبقة طباعة أفقية (A4 landscape) قابلة للحفظ PDF من نافذة الطباعة.

const TODAY_ISO = () => new Date().toISOString().slice(0, 10)

function emptyCertificate(): CertificateDoc {
  const now = Date.now()
  return {
    id: makeId(),
    type: 'thanks',
    studentName: '',
    grade: '',
    reason: '',
    dateISO: TODAY_ISO(),
    createdAt: now,
    updatedAt: now,
  }
}

/** ورقة الشهادة — مشتركة بين المعاينة الحية وطبقة الطباعة */
export function CertificateSheet({
  type,
  studentName,
  grade,
  reason,
  dateISO,
  school,
  teacher,
  semester,
}: {
  type: CertificateType
  studentName: string
  grade?: string
  reason: string
  dateISO?: string
  school: string
  teacher: string
  semester: string
}) {
  const meta = CERT_TYPE_META[type]
  return (
    <div className="cert-sheet" dir="rtl" role="img" aria-label={`${meta.title} باسم ${studentName || 'الطالب'}`}>
      <div className="cert-frame" aria-hidden="true" />
      <span className="cert-corner cert-tr" aria-hidden="true">❁</span>
      <span className="cert-corner cert-tl" aria-hidden="true">❁</span>
      <span className="cert-corner cert-br" aria-hidden="true">❁</span>
      <span className="cert-corner cert-bl" aria-hidden="true">❁</span>

      <div className="cert-body">
        <p className="cert-country">المملكة العربية السعودية</p>
        <p className="cert-ministry">وزارة التعليم</p>
        <p className="cert-school">{school || 'المدرسة'}</p>

        <h1 className="cert-title">{meta.title}</h1>
        <div className="cert-flourish" aria-hidden="true">— ✦ —</div>

        <p className="cert-opening">{meta.opening}</p>
        <p className="cert-name">{studentName.trim() || '....................'}</p>
        {(grade?.trim() || semester) && (
          <p className="cert-grade">
            {grade?.trim() ? `الصف: ${grade.trim()}` : ''}
            {grade?.trim() && semester ? ' · ' : ''}
            {semester ? `الفصل الدراسي: ${semester}` : ''}
          </p>
        )}

        <p className="cert-reason">{reason.trim() || '....................'}</p>
        <p className="cert-wish">سائلين الله له دوام التوفيق والنجاح.</p>

        <div className="cert-footer">
          <div className="cert-sig">
            <span className="cert-sig-name">{teacher || '....................'}</span>
            <span className="cert-sig-role">معلم/ة المادة</span>
          </div>
          <div className="cert-date">{dateISO ? formatDate(new Date(`${dateISO}T12:00:00`).getTime()) : ''}</div>
          <div className="cert-sig">
            <span className="cert-sig-name">........................</span>
            <span className="cert-sig-role">مدير/ة المدرسة</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CertificateEditor() {
  const { id } = useParams()
  const { data, ready, saveCertificate, deleteCertificate } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const existing = id ? data.certificates?.find((c) => c.id === id) : undefined
  const [form, setForm] = useState<CertificateDoc>(existing ?? emptyCertificate())
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
    return <NotFoundLink label="شهادة" back="/certificates" />
  }

  const patch = (p: Partial<CertificateDoc>) => setForm((f) => ({ ...f, ...p }))
  const meta = CERT_TYPE_META[form.type]

  const handleSave = () => {
    const doc: CertificateDoc = {
      ...form,
      studentName: form.studentName.trim(),
      grade: form.grade?.trim() || undefined,
      reason: form.reason.trim(),
    }
    const errs = validateCertificate(doc)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast('راجع الحقول المطلوبة قبل الحفظ.', 'error')
      return
    }
    saveCertificate({ ...doc, updatedAt: Date.now() })
    toast('حُفظت الشهادة بنجاح.')
    navigate('/certificates')
  }

  return (
    <>
      {/* صفحة أفقية خاصة بطباعة الشهادات فقط — تُزال عند مغادرة المحرر */}
      <style>{'@page { size: A4 landscape; margin: 7mm; }'}</style>

      <PageHeader
        title={form.studentName ? `شهادة: ${form.studentName}` : 'شهادة طالب'}
        subtitle="أنشئ شهادة شكر أو تفوق أو تحفيز باسم الطالب، اطبعها أو احفظها PDF."
        actions={
          <>
            <Button variant="outline" onClick={printNow} title="أرسل الشهادة إلى الطابعة">
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
        <div className="space-y-4 xl:col-span-1">
          <Card className="grid gap-4">
            <Field label="نوع الشهادة" htmlFor="cert-type">
              <Select
                id="cert-type"
                value={form.type}
                onChange={(e) => patch({ type: e.target.value as CertificateType })}
              >
                {CERT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CERT_TYPE_META[t].title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="اسم الطالب/ة" htmlFor="cert-name" required error={errors.studentName}>
              <Input
                id="cert-name"
                value={form.studentName}
                onChange={(e) => patch({ studentName: e.target.value })}
                placeholder="مثال: سارة عبدالله الأحمد"
                maxLength={60}
              />
            </Field>

            <Field label="الصف (اختياري)" htmlFor="cert-grade">
              <Input
                id="cert-grade"
                list="cert-grades"
                value={form.grade ?? ''}
                onChange={(e) => patch({ grade: e.target.value })}
                placeholder="اختر أو اكتب الصف"
              />
              <datalist id="cert-grades">
                {GRADE_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>

            <Field label="سبب التقدير" htmlFor="cert-reason" required error={errors.reason} hint="اختر عبارة مقترحة بالأسفل أو اكتب سببك الخاص.">
              <Textarea
                id="cert-reason"
                rows={3}
                value={form.reason}
                onChange={(e) => patch({ reason: e.target.value })}
                placeholder="اكتب سبب منح الشهادة..."
                maxLength={300}
              />
            </Field>

            <div className="flex flex-wrap gap-1.5" aria-label="عبارات سبب مقترحة">
              {meta.phrases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => patch({ reason: p })}
                  className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 transition hover:bg-brand-100 hover:text-brand-800 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-brand-900/50 dark:hover:text-brand-200"
                >
                  {p}
                </button>
              ))}
            </div>

            <Field label="تاريخ الإصدار" htmlFor="cert-date">
              <Input id="cert-date" type="date" value={form.dateISO ?? ''} onChange={(e) => patch({ dateISO: e.target.value })} />
            </Field>
          </Card>

          <Card className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            توقيع «معلم/ة المادة» يُعبأ من ملفك الشخصي (الإعدادات)، ويمكنك تعديل تاريخ الشهادة من النموذج. عند الطباعة اختر
            الاتجاه الأفقي إن لم يُطبق تلقائيًا.
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">معاينة حية</h2>
              <Badge className={meta.badgeClass}>{meta.label}</Badge>
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
              <CertificateSheet
                type={form.type}
                studentName={form.studentName}
                grade={form.grade}
                reason={form.reason}
                dateISO={form.dateISO}
                school={data.settings.profile.school}
                teacher={data.settings.profile.name}
                semester={data.settings.profile.semester}
              />
            </div>
          </Card>
        </div>
      </div>

      <PrintFrame>
        <CertificateSheet
          type={form.type}
          studentName={form.studentName}
          grade={form.grade}
          reason={form.reason}
          dateISO={form.dateISO}
          school={data.settings.profile.school}
          teacher={data.settings.profile.name}
          semester={data.settings.profile.semester}
        />
      </PrintFrame>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف الشهادة"
        message={`سيُحذف «${form.studentName || 'هذه الشهادة'}» نهائيًا. هل تريد المتابعة؟`}
        confirmLabel="حذف"
        onConfirm={() => {
          deleteCertificate(form.id)
          toast('حُذفت الشهادة.')
          navigate('/certificates')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
