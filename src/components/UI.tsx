import { forwardRef, useId, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { IconClose } from './icons'
import { cn } from '../lib/cn'

// ============ عناصر الواجهة الأساسية ============

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'subtle'
    size?: 'sm' | 'md' | 'lg' | 'icon'
  }
>(function Button({ className, variant = 'primary', size = 'md', type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 select-none disabled:pointer-events-none disabled:opacity-50',
        {
          primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500',
          outline:
            'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
          ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50',
          danger: 'bg-rose-600 text-white hover:bg-rose-700',
          subtle: 'bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-900/60',
        }[variant],
        {
          sm: 'px-2.5 py-1.5 text-xs',
          md: 'px-3.5 py-2 text-sm',
          lg: 'px-5 py-2.5 text-base',
          icon: 'p-2',
        }[size],
        className,
      )}
      {...rest}
    />
  )
})

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      lang={rest.type === 'number' ? 'en' : rest.lang}
      className={cn(
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
        className,
      )}
      {...rest}
    />
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
          className,
        )}
        {...rest}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 [&>option]:dark:bg-slate-800',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

interface FieldProps {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
  required?: boolean
}

export function Field({ label, hint, error, htmlFor, children, className, required }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function DemoBadge() {
  return (
    <Badge className="bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800">
      تجريبي
    </Badge>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-400 dark:border-t-transparent',
        className,
      )}
      role="status"
      aria-label="جارٍ التحميل"
    />
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800/50">
      {icon && <div className="mb-3 text-brand-600 dark:text-brand-300">{icon}</div>}
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      {description && (
        <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- نافذة تأكيد ----------

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger,
  requireText,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** إجبار المستخدم على كتابة نص معيّن لتأكيد العملية الخطرة */
  requireText?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useId()
  const inputId = `${dialogRef}-confirm-input`
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  const blocked = requireText !== undefined && typed !== requireText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogRef}-title`}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <h3 id={`${dialogRef}-title`} className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
        {requireText && (
          <div className="mt-3">
            <label htmlFor={inputId} className="mb-1 block text-xs text-slate-600 dark:text-slate-300">
              اكتب <span className="font-bold text-rose-600 dark:text-rose-400">{requireText}</span> للتأكيد:
            </label>
            <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={blocked || busy}>
            {busy ? 'جارٍ…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------- نافذة عرض عامة ----------

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const modalId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        className={cn(
          'relative max-h-[85vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800',
          wide ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 id={`${modalId}-title`} className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <IconClose />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
