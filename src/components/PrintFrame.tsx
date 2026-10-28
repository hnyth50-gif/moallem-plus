import type { ReactNode } from 'react'
import { useToast } from '../state/ToastContext'
import { Button } from './UI'
import { IconDownload } from './icons'
import { cn } from '../lib/cn'

// ============ إطار الطباعة ============
// منطقة مخصصة تظهر عند الطباعة فقط: عبر CSS في index.css
// (تُخفى كل محتويات الصفحة ويظهر #print-root وحده).

export function PrintFrame({ children }: { children: ReactNode }) {
  return (
    <div id="print-root" className="hidden">
      {/* rendered لكنه مقيد بـCSS الطباعة */}
      {children}
    </div>
  )
}

export function printNow(): void {
  window.print()
}

/**
 * زر «حفظ PDF»: يفتح نافذة الطباعة الأصلية للمتصفح ليختار المستخدم
 * وجهة «حفظ بـ PDF» — تحافظ على تشكيل العربية وجودتها متجهيًا دون مكتبات إضافية.
 */
export function SavePdfButton({ className, label = 'حفظ PDF' }: { className?: string; label?: string }) {
  const { toast } = useToast()
  return (
    <Button
      variant="outline"
      className={className}
      title="يفتح نافذة الطباعة لاختيار وجهة «حفظ بـ PDF»"
      onClick={() => {
        toast('في نافذة الطباعة اختر الوجهة «حفظ بـ PDF» ثم احفظ الملف على جهازك.')
        window.setTimeout(() => window.print(), 450)
      }}
    >
      <IconDownload className="h-4 w-4" /> {label}
    </Button>
  )
}

/* — الحاويات الورقية لطبقة الطباعة — */

export function Paper({ children }: { children: ReactNode }) {
  return <div className="paper">{children}</div>
}

export function PaperHeader({
  school,
  teacher,
  semester,
  title,
  meta,
}: {
  school: string
  teacher: string
  semester?: string
  title: string
  meta: string
}) {
  return (
    <div className="paper-header">
      <div className="paper-school">{school || 'المدرسة'}</div>
      <h1 className="paper-title">{title}</h1>
      <div className="paper-meta">
        {teacher && <span>المعلم: {teacher}</span>}
        {semester && <span>الفصل: {semester}</span>}
        <span>{meta}</span>
      </div>
    </div>
  )
}

export function PaperSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="paper-section">
      <h2 className="paper-section-title">{title}</h2>
      {children}
    </section>
  )
}

export function PaperList({ items, ordered }: { items: string[]; ordered?: boolean }) {
  if (items.length === 0) return <p className="paper-muted">—</p>
  const ListTag = ordered ? 'ol' : 'ul'
  return (
    <ListTag className={ordered ? 'paper-ol' : 'paper-ul'}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ListTag>
  )
}

export function HintBox({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('paper-muted text-xs mt-2', className)}>{children}</div>
}
