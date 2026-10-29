import { useState } from 'react'
import { useCloud } from '../state/CloudContext'
import { useData } from '../state/DataContext'
import { loadAppState } from '../lib/storage'
import { useToast } from '../state/ToastContext'
import { Badge, Button, Card, ConfirmDialog, Field, Input } from './UI'
import { IconCloud } from './icons'
import { formatRelative } from '../lib/format'

// ============ الحساب والمزامنة السحابية (Supabase) ============
// تسجيل الدخول/إنشاء حساب/الخروج + حالة المزامنة. عند عدم توفر الإعدادات
// أو تعذر تحميل مكتبة الـ CDN تظهر بطاقة إرشادية هادئة ويعمل التطبيق محليًا.

const SYNC_LABEL: Record<string, string> = {
  idle: 'بانتظار التحقق من المزامنة',
  syncing: 'تتم المزامنة الآن…',
  error: 'فشلت آخر مزامنة — ستعيد المحاولة تلقائيًا',
  offline: 'غير متصل — سيُدفع كل التغييرات عند العودة',
}

export function AuthPanel() {
  const cloud = useCloud()
  const { toast } = useToast()
  const { importGuestData } = useData()
  const [confirmImport, setConfirmImport] = useState(false)
  const guest = loadAppState()
  const guestCount = guest ? guest.plans.length + guest.activities.length + guest.quizzes.length + guest.customCards.length + (guest.weekEntries?.length ?? 0) + (guest.certificates?.length ?? 0) : 0
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloud.cloudAvailable || cloud.status === 'unavailable') {
    const configured = cloud.cloudAvailable
    return (
      <Card className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <IconCloud className="h-5 w-5 text-slate-400" /> الحساب والمزامنة السحابية
        </h2>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {configured
            ? 'تعذّر تحميل خدمة المزامنة الآن (ربما لست متصلًا) — بياناتك تُحفظ محليًا وتعمل دون اتصال كالمعتاد، وستتوفر المزامنة تلقائيًا عند عودة الاتصال.'
            : 'المزامنة السحابية غير مهيأة في هذا النشر — بياناتك تُحفظ محليًا على هذا الجهاز وتعمل دون اتصال كالمعتاد. لتفعيل حسابات متعددة تُضاف إعدادات Supabase عند بناء الموقع (متغيرا '}
          {configured ? null : (
            <>
              <span dir="ltr">VITE_SUPABASE_URL</span> و<span dir="ltr">VITE_SUPABASE_PUBLISHABLE_KEY</span>).
            </>
          )}
        </p>
      </Card>
    )
  }

  const submit = async (mode: 'signIn' | 'signUp') => {
    if (!email.trim() || !password) {
      toast('أدخل البريد الإلكتروني وكلمة المرور.', 'error')
      return
    }
    if (password.length < 6) {
      toast('كلمة المرور يجب أن تكون 6 محارف على الأقل.', 'error')
      return
    }
    setBusy(true)
    const res = mode === 'signIn' ? await cloud.signIn(email, password) : await cloud.signUp(email, password)
    setBusy(false)
    if (!res.ok) {
      toast(res.reason ?? 'تعذر إكمال العملية.', 'error')
      return
    }
    if (mode === 'signUp') {
      toast(res.reason === 'needs-confirmation' ? 'أُرسل رابط تأكيد إلى بريدك — أكّد التسجيل ثم سجّل الدخول.' : 'أُنشئ الحساب وتم تسجيل الدخول.')
      if (res.reason === 'needs-confirmation') return
    } else {
      toast('مرحبًا بك مجددًا — تتم الآن مزامنة بياناتك.')
    }
    setPassword('')
  }

  if (cloud.status === 'signedIn' && cloud.user) {
    const syncLabel = cloud.syncState === 'idle' && cloud.lastSyncedAt ? `متزامنة — آخر مزامنة ${formatRelative(cloud.lastSyncedAt)}` : (SYNC_LABEL[cloud.syncState] ?? 'متزامنة')
    return (
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <IconCloud className="h-5 w-5 text-brand-600 dark:text-brand-300" /> الحساب والمزامنة السحابية
          <Badge>{syncLabel}</Badge>
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          مسجّل الدخول باسم <span dir="ltr" className="font-semibold">{cloud.user.email}</span> — بياناتك تُحفظ في السحابة وتُتاح على أي جهاز تسجل منه، وتبقى تعمل دون اتصال وتتزامن تلقائيًا عند العودة.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => cloud.requestSync()} disabled={cloud.syncState === 'syncing'}>
            مزامنة الآن
          </Button>
          {guestCount > 0 && (
            <Button variant="outline" onClick={() => setConfirmImport(true)}>
              نقل مستندات الجهاز ({guestCount}) إلى حسابي
            </Button>
          )}
          <Button variant="ghost" onClick={() => void cloud.signOut()}>
            تسجيل الخروج
          </Button>
        </div>
        <ConfirmDialog
          open={confirmImport}
          title="نسخ بيانات الجهاز إلى الحساب"
          message="سيتم نسخ المستندات القديمة إلى حسابك الحالي دون حذف نسختها المحلية. تحقّق من أنها تخص هذا الحساب فقط قبل المتابعة، واحتفظ بنسخة احتياطية."
          confirmLabel="نسخ البيانات"
          onConfirm={() => { importGuestData(); setConfirmImport(false) }}
          onCancel={() => setConfirmImport(false)}
        />
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <IconCloud className="h-5 w-5 text-slate-400" /> الحساب والمزامنة السحابية
      </h2>
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        أنشئ حسابًا لحفظ خططك وأنشطتك واختباراتك في السحابة بأمان — بيانات كل مستخدم معزولة عن غيره، وتتزامن بين أجهزتك تلقائيًا.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="البريد الإلكتروني" htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@example.com"
          />
        </Field>
        <Field label="كلمة المرور" htmlFor="auth-password">
          <Input
            id="auth-password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 محارف على الأقل"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit('signIn')} disabled={busy}>
          {busy ? 'جارٍ الاتصال…' : 'تسجيل الدخول'}
        </Button>
        <Button variant="outline" onClick={() => void submit('signUp')} disabled={busy}>
          إنشاء حساب جديد
        </Button>
      </div>
    </Card>
  )
}
