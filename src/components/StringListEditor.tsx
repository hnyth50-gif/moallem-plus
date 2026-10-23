import { Button } from './UI'
import { IconPlus, IconTrash } from './icons'
import { cn } from '../lib/cn'

// ============ محرر قوائم نصية (أهداف، خطوات، مواد...) ============
// صفوف سلسلة نصية مع إضافة/حذف/عدّ.

export interface StringListEditorProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  textarea?: boolean
  addLabel?: string
  /** تسمية الوصف بجانب رقم الصف (للقراءة الآلية) */
  itemNoun?: string
  error?: string
  className?: string
}

export function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
  textarea = false,
  addLabel = 'إضافة',
  itemNoun = 'سطرًا',
  error,
  className,
}: StringListEditorProps) {
  const update = (index: number, value: string) => {
    const next = [...items]
    next[index] = value
    onChange(next)
  }
  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }
  const add = () => {
    onChange([...items, ''])
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <Button variant="subtle" size="sm" onClick={add}>
          <IconPlus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      {items.length === 0 && !error && (
        <p className="text-xs text-slate-400 dark:text-slate-500">لا عناصر بعد — اضغط «{addLabel}».</p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span
              className="mt-2 min-w-6 shrink-0 select-none rounded-md bg-slate-100 px-1.5 text-center text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {textarea ? (
              <textarea
                value={item}
                rows={2}
                onChange={(e) => update(index, e.target.value)}
                placeholder={placeholder}
                aria-label={`${label} — ${itemNoun} ${index + 1}`}
                className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
              />
            ) : (
              <input
                type="text"
                value={item}
                onChange={(e) => update(index, e.target.value)}
                placeholder={placeholder}
                aria-label={`${label} — ${itemNoun} ${index + 1}`}
                className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
              onClick={() => remove(index)}
              aria-label={`إزالة ${itemNoun} ${index + 1} من ${label}`}
              title="إزالة"
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">ترتيب المظهر في الطباعة يتبع ترتيب الأسطر هنا.</p>
      )}
    </div>
  )
}
