import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import { CARD_CATEGORIES, type CardCategory, type ThinkingCard } from '../lib/types'
import { CATEGORY_LABELS } from '../lib/strategies'
import { makeId } from '../lib/id'
import { validateCard } from '../lib/validate'
import { Button, Card, Field, Input, PageHeader, Select, Textarea, Spinner } from '../components/UI'
import { StringListEditor } from '../components/StringListEditor'
import { IconPlus } from '../components/icons'
import { NotFoundLink } from './ActivityEditor'

// ============ محرر بطاقة استراتيجية خاصة ============
// بطاقات المعلم تُحفظ محليًا في customCards (النسخ: builtin غير قابلة للتعديل).

function emptyCard(): ThinkingCard {
  const now = Date.now()
  return {
    id: makeId(),
    title: '',
    category: 'cooperative',
    brief: '',
    steps: [''],
    timing: '',
    suitableFor: '',
    tips: '',
    updatedAt: now,
  }
}

export function CardEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const { data, ready, saveCard } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const existing =
    mode === 'edit' && id ? data.customCards.find((c) => c.id === id) : undefined
  const [form, setForm] = useState<ThinkingCard>(existing ?? emptyCard())
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
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

  if (mode === 'edit' && !existing) {
    return <NotFoundLink label="بطاقة" back="/cards" />
  }

  const patch = (p: Partial<ThinkingCard>) => setForm((f) => ({ ...f, ...p }))

  const handleSave = () => {
    const doc: ThinkingCard = {
      ...form,
      title: form.title.trim(),
      brief: form.brief.trim(),
      steps: form.steps.filter((s) => s.trim()),
      builtin: false,
      updatedAt: Date.now(),
    }
    const errs = validateCard(doc)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast('راجع الحقول المطلوبة قبل الحفظ.', 'error')
      return
    }
    saveCard(doc)
    toast(mode === 'create' ? 'أُنشئت البطاقة الخاصة.' : 'حُفظت التعديلات على البطاقة.')
    navigate(`/cards/${doc.id}`)
  }

  // في وضع edit مع سياق غير جاهز؛ التحرير المباشر يبدأ من نسخة العنصر الموجود
  return (
    <>
      <PageHeader
        title="بطاقة استراتيجية خاصة"
        subtitle="أنشئ بطاقة بأسلوبك: فكرة، خطوات، زمن، ومدى ملاءمتها."
        actions={<Button onClick={handleSave}>حفظ البطاقة</Button>}
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم البطاقة" htmlFor="card-title" required error={errors.title} className="sm:col-span-2">
            <Input id="card-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="مثال: طاولة الملاحظة والتلخيص" />
          </Field>
          <Field label="الفئة" htmlFor="card-category">
            <Select id="card-category" value={form.category} onChange={(e) => patch({ category: e.target.value as CardCategory })}>
              {CARD_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="الزمن المقترح" htmlFor="card-timing">
            <Input id="card-timing" value={form.timing} onChange={(e) => patch({ timing: e.target.value })} placeholder="مثال: من 5 إلى 10 دقائق" />
          </Field>
          <Field label="الفكرة الموجزة" htmlFor="card-brief" required error={errors.brief} className="sm:col-span-2">
            <Textarea id="card-brief" value={form.brief} onChange={(e) => patch({ brief: e.target.value })} placeholder="جملة أو جملتان تشرحان الاستراتيجية" />
          </Field>
          <Field label="مناسبة لـ" htmlFor="card-suitable" className="sm:col-span-2">
            <Input id="card-suitable" value={form.suitableFor} onChange={(e) => patch({ suitableFor: e.target.value })} placeholder="مثال: نهاية الوحدات، دروس القراءة…" />
          </Field>
        </Card>

        <Card>
          <StringListEditor
            label="خطوات التنفيذ"
            items={form.steps}
            onChange={(steps) => patch({ steps })}
            placeholder="اكتب خطوة قابلة للتنفيذ"
            textarea
            addLabel="إضافة خطوة"
            itemNoun="خطوة"
          />
        </Card>

        <Card>
          <Field label="نصيحة للمعلم" htmlFor="card-tips">
            <Textarea id="card-tips" value={form.tips} onChange={(e) => patch({ tips: e.target.value })} />
          </Field>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave}>
            <IconPlus className="h-4 w-4" /> حفظ البطاقة
          </Button>
          <Link to="/cards">
            <Button variant="ghost">إلغاء</Button>
          </Link>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          ملاحظة: البطاقات المدمجة في المكتبة غير قابلة للتعديل — إن أردت نسخة منها للتعديل افتحها واضغط «أنشئ نسخة قابلة للتعديل».
        </p>
      </div>
    </>
  )
}
