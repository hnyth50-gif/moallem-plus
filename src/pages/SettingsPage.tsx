import { useRef, useState } from 'react'
import { useData } from '../state/DataContext'
import { useTheme } from '../state/ThemeContext'
import { useCloud } from '../state/CloudContext'
import { useToast } from '../state/ToastContext'
import { estimateKb } from '../lib/storage'
import { ACCENTS, applyAccent, restoreAccent, saveAccent } from '../lib/accent'
import { BackgroundPicker } from '../components/BackgroundPicker'
import { AuthPanel } from '../components/AuthPanel'
import { Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Card } from '../components/UI'
import { IconDownload, IconUpload, IconTrash, IconMoon, IconSun, IconRefresh, IconAlert } from '../components/icons'
import { formatPoints } from '../lib/format'

// ============ الإعدادات ============
// ملف المعلم، المظهر، وأدوات البيانات: تصدير / استيراد / بيانات تجريبية / حذف كل شيء.

export function SettingsPage() {
  const { data, updateProfile, exportBackup, importBackup, loadDemoData, removeDemoData, deleteAllData } = useData()
  const { theme, setTheme } = useTheme()
  const cloud = useCloud()
  const { toast } = useToast()
  const [accent, setAccent] = useState(() => restoreAccent())
  const profile = data.settings.profile

  const fileRef = useRef<HTMLInputElement>(null)

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingRaw, setPendingRaw] = useState<unknown | null>(null)

  const demoCount =
    data.plans.filter((d) => d.demo).length +
    data.activities.filter((d) => d.demo).length +
    data.quizzes.filter((d) => d.demo).length +
    data.customCards.filter((d) => d.demo).length

  const kb = formatPoints(estimateKb(data))

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast('اختر ملف نسخة احتياطية بصيغة JSON.', 'error')
      return
    }
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      setPendingRaw(parsed)
      setImportOpen(true)
    } catch {
      toast('تعذر قراءة الملف — تأكد أنه نسخة احتياطية صالحة.', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const doImport = (mode: 'merge' | 'replace') => {
    const result = importBackup(pendingRaw, mode)
    setImportOpen(false)
    setPendingRaw(null)
    if (!result.ok) toast(result.reason ?? 'تعذر الاستيراد.', 'error')
  }

  const demoStats = {
    plans: data.plans.filter((d) => d.demo).length,
    activities: data.activities.filter((d) => d.demo).length,
    quizzes: data.quizzes.filter((d) => d.demo).length,
    cards: data.customCards.filter((d) => d.demo).length,
  }

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="ملفك، حسابك السحابي، المظهر، ونسخك الاحتياطية — في مكان واحد." />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* الملف الشخصي */}
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">ملف المعلم</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تظهر هذه البيانات في ترويسة الورق المطبوع (الخطة/الاختبار/النشاط/البطاقة) فقط.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="اسم المعلم" htmlFor="prof-name">
              <Input id="prof-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="مثال: أحمد الخطيب" />
            </Field>
            <Field label="المدرسة" htmlFor="prof-school">
              <Input id="prof-school" value={profile.school} onChange={(e) => updateProfile({ school: e.target.value })} placeholder="مثال: مدرسة النور" />
            </Field>
            <Field label="الفصل الدراسي" htmlFor="prof-semester">
              <Input id="prof-semester" value={profile.semester} onChange={(e) => updateProfile({ semester: e.target.value })} placeholder="مثال: الفصل الأول" />
            </Field>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">الحفظ تلقائي مع كل تغيير.</p>
        </Card>

        {/* الحساب والمزامنة السحابية (Supabase) */}
        <AuthPanel />

        {/* المظهر */}
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">المظهر</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="اختيار المظهر">
            {(
              [
                { id: 'light', label: 'فاتح', icon: <IconSun className="h-4 w-4" /> },
                { id: 'dark', label: 'داكن', icon: <IconMoon className="h-4 w-4" /> },
                { id: 'system', label: 'حسب النظام', icon: <IconRefresh className="h-4 w-4" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => setTheme(t.id)}
                className={
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ' +
                  (theme === t.id
                    ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40')
                }
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* لون الموقع */}
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100" id="accent-heading">
              لون الموقع
            </p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-labelledby="accent-heading">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={accent.id === a.id}
                  onClick={() => {
                    applyAccent(a)
                    saveAccent(a)
                    setAccent(a)
                    toast(`تغيّر لون الموقع إلى «${a.label}».`)
                  }}
                  title={a.label}
                  aria-label={a.label}
                  className={
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ' +
                    (accent.id === a.id
                      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40')
                  }
                >
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: a.swatch }}
                    aria-hidden="true"
                  />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <BackgroundPicker />
        </Card>

        {/* أدوات البيانات */}
        <Card className="space-y-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">بياناتي وأدوات النسخ الاحتياطي</h2>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900/40">
            <span className="text-slate-600 dark:text-slate-300">حجم بياناتك المحلية الحالية</span>
            <Badge className="bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{kb} ك.ب</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={exportBackup}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-start transition hover:border-brand-400 dark:border-slate-700 dark:hover:border-brand-500"
            >
              <IconDownload className="mt-0.5 text-brand-600 dark:text-brand-300" />
              <span>
                <span className="block font-semibold text-slate-800 dark:text-slate-100">تصدير نسخة احتياطية</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">ملف JSON كامل بكل خططك وأنشطتك واختباراتك — متوافق بين الأجهزة.</span>
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-full w-full items-start gap-3 rounded-2xl border border-slate-200 p-4 text-start transition hover:border-brand-400 dark:border-slate-700 dark:hover:border-brand-500"
              >
                <IconUpload className="mt-0.5 text-brand-600 dark:text-brand-300" />
                <span>
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">استيراد نسخة احتياطية</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">دمج مع بياناتك الحالية أو استبدال كامل بضغطتين.</span>
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="sr-only"
                aria-label="اختر ملف نسخة احتياطية"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-800/60 dark:bg-amber-900/20">
            <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
              <IconAlert className="h-4 w-4" />
              البيانات التجريبية
            </div>
            <p className="mb-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              أُضيف عنصر نموذجي في كل قسم (خطة، نشاط، اختبار، بطاقة) تظهر بشارة «تجريبي».
              العناصر حاليًا: {formatPoints(demoCount)} ({formatPoints(demoStats.plans)} خرائط،{' '}
              {formatPoints(demoStats.activities)} أنشطة، {formatPoints(demoStats.quizzes)} اختبارات،{' '}
              {formatPoints(demoStats.cards)} بطاقات).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={loadDemoData}>إضافة/تحديث العناصر التجريبية</Button>
              <Button variant="ghost" size="sm" className="text-amber-700 dark:text-amber-300" disabled={demoCount === 0} onClick={removeDemoData}>
                إزالة العناصر التجريبية
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm dark:border-rose-900/60 dark:bg-rose-900/20">
            <div className="mb-2 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
              <IconTrash className="h-4 w-4" />
              منطقة الخطر
            </div>
            <p className="mb-3 text-xs leading-relaxed text-rose-600 dark:text-rose-300">
              {cloud.status === 'signedIn'
                ? 'قد يمتد حذف المستندات إلى حسابك السحابي عند مزامنته. صدّر نسخة احتياطية وتأكد من هوية الحساب أولًا.'
                : 'حذف المستندات من هذا المتصفح. لا رجعة بعد الحذف — صدّر نسخة احتياطية أولًا.'}
            </p>
            <Button variant="danger" size="sm" onClick={() => setConfirmDeleteAll(true)}>
              حذف جميع بياناتي
            </Button>
          </div>
        </Card>

        {/* الخصوصية */}
        <Card className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">الخصوصية والأمان</h2>
          <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>تُحفظ بيانات الضيف في هذا المتصفح. عند تسجيل دخولك تُحفظ مستندات حسابك محليًا وتُزامَن مع Supabase بعد نجاح الاتصال.</li>
            <li>مرفقات الملفات تُحفظ في IndexedDB على هذا الجهاز ولم يبدأ نقل محتواها إلى التخزين السحابي بعد.</li>
            <li>لا يطلب التطبيق أي صلاحيات أو وصول إلى الميكروفون أو الكاميرا أو المجلدات.</li>
            <li>النسخ الاحتياطية تصدّرها وتستوردها بنفسك — احفظ الملف في مكان موثوق.</li>
            <li>تنظيف بيانات المتصفح (السجل/الملفات) يحذف بيانات التطبيق؛ استخدم التصدير أولًا.</li>
          </ul>
        </Card>
      </div>

      {/* حوار اختيار وضع الاستيراد */}
      <Modal open={importOpen} title="استيراد النسخة الاحتياطية" onClose={() => { setImportOpen(false); setPendingRaw(null) }}>
        <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          اختر كيف تريد التعامل مع بياناتك الحالية:
        </p>
        <div className="grid gap-2">
          <Button variant="primary" onClick={() => doImport('merge')}>
            دمج مع بياناتي الحالية (يُحتفظ بتحديثات كل طرف الأحدث)
          </Button>
          <Button variant="outline" onClick={() => doImport('replace')}>
            استبدال بياناتي بالكامل بمحتوى الملف
          </Button>
          <Button variant="ghost" onClick={() => { setImportOpen(false); setPendingRaw(null) }}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteAll}
        title="حذف كل البيانات"
        message={cloud.status === 'signedIn'
          ? 'سيحذف مستندات هذا الحساب محليًا ويُرسل حذفها إلى السحابة عند المزامنة. احتفظ بنسخة احتياطية أولًا. لن يُحذف حسابك نفسه.'
          : 'سيتم حذف المستندات المحلية من هذا المتصفح نهائيًا. صدّر نسخة احتياطية أولًا.'}
        confirmLabel="نعم، احذف الكل"
        danger
        requireText="حذف"
        onConfirm={() => {
          deleteAllData()
          setConfirmDeleteAll(false)
        }}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </>
  )
}
