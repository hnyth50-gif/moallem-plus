import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import type { CertificateDoc, CertificateType } from '../lib/types'
import { CERT_TYPE_META } from '../lib/certificates'
import { formatDate } from '../lib/format'
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconBadge, PageHeader, Spinner } from '../components/UI'
import { IconCertificate, IconEdit, IconPlus, IconTrash } from '../components/icons'

// ============ قائمة شهادات الطلاب ============

export function CertificatesPage() {
  const { data, ready, deleteCertificate } = useData()
  const { toast } = useToast()
  const [pendingDelete, setPendingDelete] = useState<CertificateDoc | null>(null)

  const certificates = useMemo(
    () => [...(data.certificates ?? [])].sort((a, b) => b.updatedAt - a.updatedAt),
    [data.certificates],
  )
  const hasDemo = certificates.some((c) => c.demo)

  if (!ready) {
    return (
      <div className="flex justify-center py-20" role="status">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="شهادات الطلاب"
        subtitle="شهادات شكر وتقدير وتفوق وتحفيز باسم الطالب — تُطبع أفقيًا أو تُحفظ PDF."
        actions={
          <Link to="/certificates/new">
            <Button>
              <IconPlus className="h-4 w-4" /> شهادة جديدة
            </Button>
          </Link>
        }
      />

      {hasDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <span>توجد شهادة تجريبية للاستعراض.</span>
        </div>
      )}

      {certificates.length === 0 ? (
        <EmptyState
          icon={<IconCertificate />}
          title="لا شهادات بعد"
          description="أنشئ أول شهادة لطالبك: اختر النوع، واكتب اسمه وسبب التقدير، ثم اطبعها أو احفظها PDF."
          action={
            <Link to="/certificates/new">
              <Button>
                <IconPlus className="h-4 w-4" /> إنشاء شهادة
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((c) => {
            const meta = CERT_TYPE_META[c.type as CertificateType] ?? CERT_TYPE_META.thanks
            return (
              <Card key={c.id} className="flex flex-col gap-3 transition hover:border-brand-300 dark:hover:border-brand-700">
                <div className="flex items-start justify-between gap-2">
                  <IconBadge size="md">
                    <IconCertificate />
                  </IconBadge>
                  <div className="flex items-center gap-1.5">
                    <Badge className={meta.badgeClass}>{meta.label}</Badge>
                    {c.demo && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">تجريبي</Badge>}
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{c.studentName}</h2>
                  {c.grade && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.grade}</p>}
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{c.reason}</p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {c.dateISO ? formatDate(new Date(`${c.dateISO}T12:00:00`).getTime()) : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link
                      to={`/certificates/${c.id}`}
                      aria-label={`تحرير شهادة ${c.studentName}`}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      onClick={() => setPendingDelete(c)}
                      aria-label={`حذف شهادة ${c.studentName}`}
                      title="حذف"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف الشهادة"
        message={`سيُحذف «${pendingDelete?.studentName ?? ''}» نهائيًا. هل تريد المتابعة؟`}
        confirmLabel="حذف"
        danger
        onConfirm={() => {
          if (!pendingDelete) return
          deleteCertificate(pendingDelete.id)
          setPendingDelete(null)
          toast('حُذفت الشهادة.')
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
