import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import type { QuizDoc, QuizQuestion, QuestionKind, Difficulty } from '../lib/types'
import { makeId } from '../lib/id'
import { GRADE_SUGGESTIONS, SUBJECT_SUGGESTIONS } from '../lib/planEngine'
import {
  DIFFICULTY_LABELS,
  MCQ_LETTERS,
  QUESTION_KINDS,
  QUIZ_SCAFFOLDS,
  assembleQuiz,
  computeTotalPoints,
  questionKindLabel,
} from '../lib/quizEngine'
import { validateQuiz, dropEmptyQuestions, validateQuestion } from '../lib/validate'
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Select, Spinner, Textarea } from '../components/UI'
import { PrintFrame, Paper, PaperHeader, printNow, SavePdfButton } from '../components/PrintFrame'
import { IconPlus, IconTrash, IconPrint, IconCopy, IconChevronDown, IconChevronUp } from '../components/icons'
import { formatPoints, pointsLabel, arabicIndex } from '../lib/format'
import { NotFoundLink } from './ActivityEditor'

// ============ محرر الاختبار ============
// بناء الأسئلة بحرية + هياكل جاهزة + خلط احترافي عند الطباعة (نسختان أ/ب) + مفتاح إجابة.

type PrintMode = 'paper' | 'key' | 'both'

function emptyQuestion(kind: QuestionKind): QuizQuestion {
  return {
    id: makeId('q'),
    kind,
    prompt: '',
    options: kind === 'mcq' ? ['', '', '', ''] : [],
    answerIdx: 0,
    tfAnswer: true,
    modelAnswer: '',
    points: kind === 'essay' ? 3 : kind === 'mcq' ? 2 : 1,
    difficulty: 'medium',
  }
}

function emptyQuiz(): QuizDoc {
  const now = Date.now()
  return {
    id: makeId(),
    kind: 'quiz',
    title: '',
    subject: '',
    grade: '',
    unit: '',
    timeMinutes: 20,
    instructions: '',
    questions: [],
    shuffle: true,
    mixOptions: true,
    twoVersions: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function QuizEditor() {
  const { id } = useParams()
  const { data, ready, saveQuiz, deleteQuiz } = useData()
  const { toast } = useToast()
  const navigate = useNavigate()
  const existing = id ? data.quizzes.find((q) => q.id === id) : undefined
  const [form, setForm] = useState<QuizDoc>(existing ?? emptyQuiz())
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [printMode, setPrintMode] = useState<PrintMode>('paper')
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
    return <NotFoundLink label="اختبار" back="/quizzes" />
  }

  const patch = (p: Partial<QuizDoc>) => setForm((f) => ({ ...f, ...p }))

  const updateQuestion = (qid: string, p: Partial<QuizQuestion>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)),
    }))
  }
  const addQuestion = (kind: QuestionKind) => patch({ questions: [...form.questions, emptyQuestion(kind)] })
  const applyScaffold = (sid: string) => {
    const scaffold = QUIZ_SCAFFOLDS.find((s) => s.id === sid)
    if (!scaffold) return
    patch({
      questions: [
        ...form.questions,
        ...scaffold.make().map((q) => ({ ...q, id: makeId('q') })),
      ],
    })
    toast(`أُضيف هيكل «${scaffold.label}» — عدّل أسئلته وأجوبته.`)
  }
  const moveQuestion = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= form.questions.length) return
    setForm((f) => {
      const questions = [...f.questions]
      ;[questions[index], questions[to]] = [questions[to], questions[index]]
      return { ...f, questions }
    })
  }
  const duplicateQuestion = (qid: string) => {
    setForm((f) => {
      const index = f.questions.findIndex((q) => q.id === qid)
      if (index === -1) return f
      const copy = { ...f.questions[index], id: makeId('q') }
      const questions = [...f.questions]
      questions.splice(index + 1, 0, copy)
      return { ...f, questions }
    })
  }
  const removeQuestion = (qid: string) => patch({ questions: form.questions.filter((q) => q.id !== qid) })

  const handleSave = () => {
    const cleaned = dropEmptyQuestions(form.questions)
    const dropped = form.questions.length - cleaned.length
    const doc: QuizDoc = { ...form, questions: cleaned }
    const errs = validateQuiz(doc)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast(errs.questions ? errs.questions : 'راجع الحقول قبل الحفظ.', 'error')
      return
    }
    saveQuiz({ ...doc, updatedAt: Date.now() })
    toast(dropped > 0 ? `حُفظ الاختبار وأُسقطت ${dropped} أسئلة فارغة.` : 'حُفظ الاختبار بنجاح.')
    navigate('/quizzes')
  }

  const totalPoints = computeTotalPoints(form.questions)
  const invalidQuestions = form.questions.map((q) => validateQuestion(q))

  return (
    <>
      <PageHeader
        title={form.title || 'اختبار جديد'}
        subtitle="أدخل أسئلتك مرة واحدة، ثم اطبع أوراقًا مرتبة بترتيب مختلف مع مفتاح إجابة مطابق."
        actions={
          <>
            <Select
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              aria-label="نمط الطباعة"
              className="w-auto"
            >
              <option value="paper">طباعة ورقة الأسئلة</option>
              <option value="key">طباعة مفتاح الإجابة</option>
              <option value="both">كلاهما</option>
            </Select>
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
            <Field label="عنوان الاختبار" htmlFor="quiz-title" required error={errors.title} className="sm:col-span-2">
              <Input id="quiz-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="اختبار الوحدة الثالثة" />
            </Field>
            <Field label="المادة" htmlFor="quiz-subject" required error={errors.subject}>
              <Input id="quiz-subject" list="dl-subjects" value={form.subject} onChange={(e) => patch({ subject: e.target.value })} />
              <datalist id="dl-subjects">
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="الصف" htmlFor="quiz-grade">
              <Input id="quiz-grade" list="dl-grades" value={form.grade} onChange={(e) => patch({ grade: e.target.value })} />
              <datalist id="dl-grades">
                {GRADE_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field label="الوحدة / المحاور" htmlFor="quiz-unit">
              <Input id="quiz-unit" value={form.unit ?? ''} onChange={(e) => patch({ unit: e.target.value })} />
            </Field>
            <Field label="زمن الاختبار (دقيقة)" htmlFor="quiz-time" error={errors.timeMinutes}>
              <Input
                id="quiz-time"
                type="number"
                min={0}
                max={300}
                value={form.timeMinutes ?? ''}
                onChange={(e) => patch({ timeMinutes: e.target.value === '' ? undefined : Math.max(0, Math.round(Number(e.target.value))) })}
              />
            </Field>
            <Field label="تعليمات طبقة الورقة (اختياري)" htmlFor="quiz-instructions" className="sm:col-span-2">
              <Textarea
                id="quiz-instructions"
                rows={2}
                value={form.instructions ?? ''}
                onChange={(e) => patch({ instructions: e.target.value })}
                placeholder="مثال: أجب عن كل الأسئلة. كل سؤال لِإجابة واحدة."
              />
            </Field>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">خيارات الطباعة الذكية</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <SwitchRow
                label="خلط ترتيب الأسئلة"
                hint="ترتيب مختلف في كل طباعة"
                checked={form.shuffle}
                onChange={(shuffle) => patch({ shuffle })}
              />
              <SwitchRow
                label="خلط خيارات الاختيار"
                hint="يتطلب خلط الترتيب"
                disabled={!form.shuffle}
                checked={form.shuffle && form.mixOptions}
                onChange={(mixOptions) => patch({ mixOptions })}
              />
              <SwitchRow
                label="نُسخة إضافية (أ/ب)"
                hint="ورقتان بترتيبين مختلفين"
                checked={form.twoVersions}
                onChange={(twoVersions) => patch({ twoVersions })}
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              ملاحظة: الخلط يُطبَّق عند الطباعة فقط — نُسخة الشاشة تبقى بترتيب الإدخال، والإجابات الصحيحة تتبع خياراتها دائمًا.
            </p>
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                الأسئلة ({formatPoints(form.questions.length)})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_KINDS.map((k) => (
                  <Button key={k.id} variant="subtle" size="sm" onClick={() => addQuestion(k.id)}>
                    <IconPlus className="h-4 w-4" /> {k.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>هياكل جاهزة:</span>
              {QUIZ_SCAFFOLDS.map((s) => (
                <Button key={s.id} variant="outline" size="sm" title={s.hint} onClick={() => applyScaffold(s.id)}>
                  {s.label}
                </Button>
              ))}
            </div>

            {errors.questions && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.questions}
              </p>
            )}
            {invalidQuestions.some(Boolean) && !errors.questions && (
              <p role="alert" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                توجد أسئلة ناقصة — ما يلزم إكماله معلَّم بالخط الأحمر.
              </p>
            )}

            <ul className="space-y-3">
              {form.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  total={form.questions.length}
                  invalidReason={invalidQuestions[i]}
                  onChange={(p) => updateQuestion(q.id, p)}
                  onMove={(dir) => moveQuestion(i, dir)}
                  onDuplicate={() => duplicateQuestion(q.id)}
                  onRemove={() => removeQuestion(q.id)}
                />
              ))}
            </ul>
            {form.questions.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                لا أسئلة بعد — أضف سؤالًا، أو اضغط أحد «الهياكل الجاهزة» أعلاه.
              </p>
            )}
          </Card>
        </div>

        <aside className="xl:col-span-1">
          <Card className="sticky top-24 text-sm">
            <h2 className="mb-2 font-bold text-slate-800 dark:text-slate-100">ملخّص الاختبار</h2>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>عدد الأسئلة: {formatPoints(form.questions.length)}</li>
              <li>مجموع النقاط: {formatPoints(totalPoints)}</li>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <li key={d}>
                  {DIFFICULTY_LABELS[d]}: {formatPoints(form.questions.filter((q) => q.difficulty === d).length)}
                </li>
              ))}
              <li>نمط الطباعة: {form.twoVersions ? 'نسختان أ/ب' : 'نسخة واحدة'} {form.shuffle ? '· مُخلوطة' : '· بالترتيب'}</li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              عند الطباعة تُبنى الأوراق من نسخة حتمية (بذرة ثابتة لك صاحب الاختبار) بحيث تتطابق ورقة الطالب مع مفتاح الإجابة المطبوع في نفس الجلسة.
            </p>
          </Card>
        </aside>
      </div>

      <PrintFrame>
        <QuizPaper quiz={form} profile={data.settings.profile} mode={printMode} />
      </PrintFrame>

      <ConfirmDialog
        open={confirmDelete}
        title="تأكيد الحذف"
        message={`سيُحذف «${form.title}» نهائيًا من هذا الجهاز.`}
        confirmLabel="حذف نهائي"
        danger
        onConfirm={() => {
          if (existing) deleteQuiz(existing.id)
          toast('حُذف الاختبار.')
          navigate('/quizzes')
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${disabled ? 'opacity-50' : 'cursor-pointer hover:border-brand-400 dark:hover:border-brand-500'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-brand-600"
      />
      <span>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>}
      </span>
    </label>
  )
}

// ---------- بطاقة سؤال ----------

function QuestionCard({
  question,
  index,
  total,
  invalidReason,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  question: QuizQuestion
  index: number
  total: number
  invalidReason: string | null
  onChange: (p: Partial<QuizQuestion>) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const q = question
  return (
    <li className={`rounded-xl border p-3 ${invalidReason ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {arabicIndex(index)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {q.prompt || <span className="text-slate-400 dark:text-slate-500">(سؤال فارغ — اضغط لتحريره)</span>}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{questionKindLabel(q.kind)} · {pointsLabel(q.points)}</span>
        <div className="flex items-center gap-0.5">
          {invalidReason && (
            <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
              {invalidReason}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`تحرير السؤال ${index + 1}`}>
            {open ? <IconChevronUp /> : <IconChevronDown />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="نسخ السؤال">
            <IconCopy />
          </Button>
          <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={onRemove} aria-label="حذف السؤال">
            <IconTrash />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label="تقديم السؤال">
            <IconChevronUp />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="تأخير السؤال">
            <IconChevronDown />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40">
          <Field label="نص السؤال" htmlFor={`q-prompt-${q.id}`} required>
            <Textarea id={`q-prompt-${q.id}`} value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
          </Field>

          {q.kind === 'mcq' && (
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">الخيارات واختيار الصحيح</span>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.answerIdx === oi}
                    onChange={() => onChange({ answerIdx: oi })}
                    aria-label={`الإجابة الصحيحة: ${MCQ_LETTERS[oi] ?? oi + 1}`}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{MCQ_LETTERS[oi] ?? oi + 1}.</span>
                  <Input value={opt} onChange={(e) => {
                    const options = [...q.options]
                    options[oi] = e.target.value
                    onChange({ options })
                  }} aria-label={`خيار ${oi + 1}`} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-500"
                    disabled={q.options.length <= 2}
                    onClick={() => {
                      const options = q.options.filter((_, i2) => i2 !== oi)
                      onChange({ options, answerIdx: Math.min(q.answerIdx >= oi ? Math.max(0, q.answerIdx - 1) : q.answerIdx, options.length - 1) })
                    }}
                    aria-label={`حذف الخيار ${oi + 1}`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {q.options.length < 8 && (
                <Button variant="outline" size="sm" onClick={() => onChange({ options: [...q.options, ''] })}>
                  <IconPlus className="h-4 w-4" /> خيار إضافي
                </Button>
              )}
            </div>
          )}

          {q.kind === 'tf' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`tf-${q.id}`} checked={q.tfAnswer} onChange={() => onChange({ tfAnswer: true })} />
                الصحيح: صح
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name={`tf-${q.id}`} checked={!q.tfAnswer} onChange={() => onChange({ tfAnswer: false })} />
                الصحيح: خطأ
              </label>
            </div>
          )}

          {(q.kind === 'short' || q.kind === 'essay') && (
            <Field label="الإجابة النموذجية (تظهر في مفتاح الإجابة)" htmlFor={`q-model-${q.id}`}>
              <Textarea id={`q-model-${q.id}`} value={q.modelAnswer} onChange={(e) => onChange({ modelAnswer: e.target.value })} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="نوع السؤال" htmlFor={`q-kind-${q.id}`}>
              <Select id={`q-kind-${q.id}`} value={q.kind} onChange={(e) => {
                const kind = e.target.value as QuestionKind
                onChange({
                  kind,
                  options: kind === 'mcq' ? (q.options.length ? q.options : ['', '', '', '']) : [],
                  modelAnswer: kind === 'short' || kind === 'essay' ? q.modelAnswer : q.modelAnswer,
                })
              }}>
                {QUESTION_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="النقاط" htmlFor={`q-points-${q.id}`}>
              <Input
                id={`q-points-${q.id}`}
                type="number"
                min={0}
                max={100}
                value={q.points}
                onChange={(e) => onChange({ points: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              />
            </Field>
            <Field label="المستوى" htmlFor={`q-diff-${q.id}`}>
              <Select id={`q-diff-${q.id}`} value={q.difficulty} onChange={(e) => onChange({ difficulty: e.target.value as Difficulty })}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}
    </li>
  )
}

// ---------- طبقة طباعة الاختبار ----------

function QuizPaper({ quiz, profile, mode }: { quiz: QuizDoc; profile: { name: string; school: string; semester: string }; mode: PrintMode }) {
  // بذرة حتمية مبنية على معرّف الاختبار — نفس الطباعة كل مرة، بلا مفاجآت.
  const baseSeed = useMemo(() => hashSeed(quiz.id), [quiz.id])
  const versions = useMemo(() => assembleQuiz(quiz, baseSeed), [quiz, baseSeed])
  const totalPoints = computeTotalPoints(quiz.questions)

  const renderPaper = (qs: QuizQuestion[], withAnswers: boolean, versionLabel: string) => (
    <>
      <PaperHeader
        school={profile.school}
        teacher={profile.name}
        semester={profile.semester}
        title={
          withAnswers
            ? `مفتاح الإجابة: ${quiz.title || '……'}${versionLabel ? ` — نسخة ${versionLabel}` : ''}`
            : `${quiz.title || '……'}${versionLabel ? ` — نسخة ${versionLabel}` : ''}`
        }
        meta={`المادة: ${quiz.subject || '……'} · الصف: ${quiz.grade || '……'}${quiz.unit ? ` · ${quiz.unit}` : ''} · الزمن: ${quiz.timeMinutes ?? '…'} دقيقة · المجموع: ${pointsLabel(totalPoints)}`}
      />
      {quiz.instructions && <p className="paper-line">تعليمات: {quiz.instructions}</p>}

      <ol className="paper-ol mt-4">
        {qs.map((q) => (
          <li key={q.id} className="paper-question">
            <span className="paper-question-text">
              {q.prompt || '«سؤال فارغ»'}
              <span className="paper-points">({pointsLabel(q.points)})</span>
            </span>

            {q.kind === 'mcq' && (
              <ul className="paper-ul">
                {q.options.map((opt, oi) => (
                  <li key={oi} className={withAnswers && q.answerIdx === oi ? 'paper-correct' : undefined}>
                    <strong>{MCQ_LETTERS[oi] ?? oi + 1} —</strong> {opt || '……'} {withAnswers && q.answerIdx === oi ? '✓' : ''}
                  </li>
                ))}
              </ul>
            )}

            {q.kind === 'tf' && (
              <span className="paper-muted">
                {withAnswers ? (q.tfAnswer ? 'الإجابة: صحيح ✓' : 'الإجابة: خطأ ✗') : '(صحيح / خطأ)'}
              </span>
            )}

            {q.kind === 'short' && !withAnswers && (
              <div className="paper-answerline" aria-hidden="true" />
            )}
            {(q.kind === 'essay' || (q.kind === 'short' && withAnswers)) && (
              <>
                {withAnswers ? (
                  <p className="paper-correct">{q.modelAnswer || '—'}</p>
                ) : (
                  <div className="paper-lines" aria-hidden="true">
                    <div /> <div /> <div />
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </>
  )

  const showPaper = mode === 'paper' || mode === 'both'
  const showKey = mode === 'key' || mode === 'both'

  return (
    <>
      {showPaper &&
        versions.map((v, vi) => (
          <Paper key={`p${vi}`}>
            <div className="print-page-break" />
            {renderPaper(v.questions, false, v.label)}
          </Paper>
        ))}
      {showKey &&
        versions.map((v, vi) => (
          <Paper key={`k${vi}`}>
            <div className="print-page-break" />
            {renderPaper(v.questions, true, v.label)}
          </Paper>
        ))}
    </>
  )
}

function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
