import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { allCards, cardById } from '../lib/lookup'
import { BUILTIN_COUNT, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/strategies'
import { CARD_CATEGORIES, type CardCategory, type ThinkingCard } from '../lib/types'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, DemoBadge, Spinner } from '../components/UI'
import { CardEditor } from './CardEditor'
import { PrintFrame, Paper, PaperHeader, PaperList, PaperSection, printNow } from '../components/PrintFrame'
import { IconSearch, IconPrint, IconPlus, IconCopy, IconEdit } from '../components/icons'
import { useToast } from '../state/ToastContext'
import { NotFoundLink } from './ActivityEditor'

// ============ صفحة بطاقات التفكير ============
// مكتبة جاهزة (BUILTIN_COUNT بطاقة) + بطاقات المعلم الخاصة، مع بحث وتصنيفات.

export function CardsPage() {
  const { data } = useData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CardCategory | ''>('')

  const cards = useMemo(() => allCards(data.customCards), [data.customCards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter(
      (c) =>
        (!category || c.category === category) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          c.brief.toLowerCase().includes(q) ||
          c.steps.some((s) => s.toLowerCase().includes(q))),
    )
  }, [cards, query, category])

  const customCount = data.customCards.length

  return (
    <>
      <PageHeader
        title="مكتبة بطاقات التفكير"
        subtitle={`${BUILTIN_COUNT} استراتيجية جاهزة في المكتبة + ${customCount} بطاقة خاصة بك`}
        actions={
          <Link to="/cards/new">
            <Button>
              <IconPlus className="h-4 w-4" /> بطاقة خاصة
            </Button>
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في البطاقات…"
            aria-label="بحث في البطاقات"
            className="pe-9"
          />
          <IconSearch className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <Link to="/settings" className="hidden text-xs sm:block sm:self-center text-slate-400 dark:text-slate-500">
          يمكن استيراد بطاقاتك من نسخة احتياطية
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="تصفية حسب الفئة">
        <ChipButton active={category === ''} onClick={() => setCategory('')}>كل الفئات</ChipButton>
        {CARD_CATEGORIES.map((c) => (
          <ChipButton key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </ChipButton>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconSearch />}
          title="لا بطاقات مطابقة"
          description="جرّب كلمة بحث أخرى أو أزل تصفية الفئة."
          action={
            <Button variant="outline" onClick={() => { setQuery(''); setCategory('') }}>
              إظهار الكل
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <li key={card.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/cards/${card.id}`}
                    className="text-base font-bold text-slate-900 hover:underline dark:text-white"
                  >
                    {card.title}
                  </Link>
                  {card.demo && <DemoBadge />}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">{card.brief}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge className={CATEGORY_COLORS[card.category]}>{CATEGORY_LABELS[card.category]}</Badge>
                  {!card.builtin && <Badge className="bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">بطاقة خاصة</Badge>}
                  <span className="ms-auto text-[11px] text-slate-400 dark:text-slate-500">{card.timing}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ChipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
        (active
          ? 'bg-brand-700 text-white dark:bg-brand-600'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600')
      }
    >
      {children}
    </button>
  )
}

/** تفاصيل بطاقة (مدمجة أو خاصة) مع الطباعة */
export function CardDetail() {
  const { id } = useParams()
  const { data, ready, saveCard, deleteCard } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const card = id ? cardById(id, data.customCards) : undefined
  if (!ready) {
    return (
      <div className="flex justify-center py-20" role="status">
        <Spinner />
      </div>
    )
  }
  if (!card) {
    return <NotFoundLink label="بطاقة" back="/cards" />
  }

  const isBuiltin = !!card.builtin
  const copyAsCustom = () => {
    const copy: ThinkingCard = { ...card, id: `copy-${card.id.slice(0, 10)}-${Date.now()}`, builtin: false, demo: false, updatedAt: Date.now() }
    saveCard(copy)
    toast('أُنشئت نسخة خاصة بك من البطاقة — عدّلها الآن.')
    navigate(`/cards/${copy.id}/edit`)
  }

  return (
    <>
      <PageHeader
        title={card.title}
        actions={
          <>
            <Button variant="outline" onClick={printNow}>
              <IconPrint className="h-4 w-4" /> طباعة البطاقة
            </Button>
            {isBuiltin ? (
              <Button onClick={copyAsCustom}>
                <IconCopy className="h-4 w-4" /> أنشئ نسخة قابلة للتعديل
              </Button>
            ) : (
              <>
                <Link to={`/cards/${card.id}/edit`}>
                  <Button>
                    <IconEdit className="h-4 w-4" /> تحرير
                  </Button>
                </Link>
                <Button variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => setConfirmDelete(true)}>
                  حذف
                </Button>
              </>
            )}
          </>
        }
      />

      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={CATEGORY_COLORS[card.category]}>{CATEGORY_LABELS[card.category]}</Badge>
          {!isBuiltin && <Badge className="bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">بطاقة خاصة</Badge>}
          {card.demo && <DemoBadge />}
        </div>
        <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">{card.brief}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
            <h3 className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">خطوات التنفيذ</h3>
            <ol className="list-decimal space-y-1.5 ps-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {card.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
              <h3 className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">الزمن المقترح</h3>
              <p className="text-slate-700 dark:text-slate-200">{card.timing}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
              <h3 className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">مناسب لـ</h3>
              <p className="text-slate-700 dark:text-slate-200">{card.suitableFor}</p>
            </div>
            <div className="rounded-xl bg-brand-50 p-3 dark:bg-brand-900/30">
              <h3 className="mb-1 text-xs font-bold text-brand-700 dark:text-brand-300">نصيحة للمعلم</h3>
              <p className="text-brand-900 dark:text-brand-200">{card.tips}</p>
            </div>
          </div>
        </div>
      </Card>

      <PrintFrame>
        <Paper>
          <PaperHeader
            school={data.settings.profile.school}
            teacher={data.settings.profile.name}
            title={`بطاقة استراتيجية: ${card.title}`}
            meta={`الفئة: ${CATEGORY_LABELS[card.category]} · الزمن: ${card.timing}`}
          />
          <PaperSection title="الفكرة">
            <p className="paper-line">{card.brief}</p>
          </PaperSection>
          <PaperSection title="الخطوات">
            <PaperList items={card.steps} ordered />
          </PaperSection>
          <PaperSection title="متى تستخدمها؟">
            <p className="paper-line">{card.suitableFor}</p>
          </PaperSection>
          <PaperSection title="نصيحة">
            <p className="paper-line">{card.tips}</p>
          </PaperSection>
        </Paper>
      </PrintFrame>

      <ConfirmDialog
        open={confirmDelete}
        title="تأكيد الحذف"
        message={`سيُحذف «${card.title}» نهائيًا من هذا الجهاز.`}
        confirmLabel="حذف نهائي"
        danger
        onConfirm={() => {
          deleteCard(card.id)
          toast('حُذفت البطاقة.')
          navigate('/cards')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

/** صفحة إنشاء بطاقة خاصة */
export function CardCreate() {
  return <CardEditor mode="create" />
}

export function CardEdit() {
  return <CardEditor mode="edit" />
}
