// ============ اختبارات تكامل Supabase (العميل، طبقة المزامنة، المصادقة) ============
// بيئة الاختبار بلا شبكة وبلا مكتبة CDN — كل المسارات يجب أن تعمل بأمان وتُرجع
// نتائج «غير متاح» بدل الانفجار، وتبقى المزامنة المحلية سليمة.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { CloudProvider, useCloud } from '../src/state/CloudContext'
import App from '../src/App'
import {
  cloudConfigured,
  cdnAvailable,
  getSupabaseClient,
  resetSupabaseClient,
} from '../src/lib/supabaseClient'
import {
  diffDocs,
  docsToOps,
  mergeCloudIntoLocal,
  normalizeRowDoc,
  pullAll,
  pushUpserts,
  pushDeletes,
  pushProfile,
  toRow,
  clearQueue,
} from '../src/lib/cloudSync'
import { normalizeCloudRow } from '../src/lib/validate'
import { emptyData } from '../src/lib/store'
import { makePlan } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#/'
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
  resetSupabaseClient()
  clearQueue()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  resetSupabaseClient()
  clearQueue()
})

describe('عميل Supabase', () => {
  it('المكتبة غائبة (بلا CDN) → العميل null دون انفجار مهما توفّر الإعداد', () => {
    expect(cdnAvailable()).toBe(false)
    expect(getSupabaseClient()).toBeNull()
    // الإعداد قد يكون موجودًا من ملف .env المحلي أو لا — كلاهما مقبول، والمهم أن العميل null
    expect(typeof cloudConfigured()).toBe('boolean')
  })
})

describe('طبقة المزامنة بلا عميل', () => {
  it('كل العمليات تعيد نتيجة آمنة دون رمي أخطاء', async () => {
    // بلا عميل: غير متاح حتى للقوائم الفارغة — العقد موحد
    expect(await pullAll('user-1')).toMatchObject({ ok: false })
    expect(await pushUpserts([], 'user-1')).toMatchObject({ ok: false })
    expect(await pushDeletes([], 'user-1')).toMatchObject({ ok: false })
    expect(await pushProfile({ name: 'أ', school: '', semester: '' }, 'user-1')).toMatchObject({ ok: false })
  })
})

describe('diffDocs (فرق التعديل للدفع)', () => {
  it('الجديد والمعدل يدفعان، وغير المماسة لا يدفع، والمحذوف يدخل قائمة الحذف', () => {
    const prev = emptyData()
    prev.plans = [
      makePlan({ id: 'plan-keep-001', updatedAt: 1000 }),
      makePlan({ id: 'plan-del-001', updatedAt: 1000 }),
      makePlan({ id: 'plan-old-001', updatedAt: 1000 }),
    ]
    const next = emptyData()
    next.plans = [
      makePlan({ id: 'plan-keep-001', updatedAt: 1000 }),
      makePlan({ id: 'plan-new-001', updatedAt: 1000 }),
      makePlan({ id: 'plan-old-001', updatedAt: 2000 }),
    ]
    const { upserts, deletes } = diffDocs(prev, next)
    const upsertIds = upserts.map((u) => u.doc.id)
    expect(upsertIds).toContain('plan-new-001')
    expect(upsertIds).toContain('plan-old-001')
    expect(upsertIds).not.toContain('plan-keep-001')
    expect(deletes).toEqual([{ kind: 'plan', id: 'plan-del-001' }])
  })

  it('docsToOps يحول كل الأنواع إلى عمليات رفع', () => {
    const data = emptyData()
    data.plans = [makePlan({ id: 'plan-a-001' })]
    data.certificates = [
      {
        id: 'cert-a-001',
        type: 'thanks',
        studentName: 'سالم',
        reason: 'التفوق',
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]
    const ops = docsToOps(data)
    expect(ops).toHaveLength(2)
    expect(ops.map((o) => o.kind)).toEqual(['plan', 'certificate'])
  })
})

describe('mergeCloudIntoLocal (دمج بالأحدث)', () => {
  it('النسخة الأحدث تفوز من أي جهة، والمستندات المحلية فقط تبقى', () => {
    const local = emptyData()
    local.plans = [
      makePlan({ id: 'plan-a-001', updatedAt: 100 }),
      makePlan({ id: 'plan-local-1', updatedAt: 500 }),
    ]
    const cloudPlans = [
      makePlan({ id: 'plan-a-001', updatedAt: 900 }),
      makePlan({ id: 'plan-cl-001', updatedAt: 300 }),
    ]
    const merged = mergeCloudIntoLocal(local, { plans: cloudPlans })
    const byId = new Map(merged.plans.map((p) => [p.id, p]))
    expect(byId.get('plan-a-001')?.updatedAt).toBe(900) // السحابة الأحدث فازت
    expect(byId.get('plan-local-1')).toBeTruthy() // محلي فقط بقي
    expect(byId.get('plan-cl-001')).toBeTruthy() // سحابي فقط دخل
  })

  it('الملف الشخصي: القيمة غير الفارغة من السحابة تُفضَّل مع بقاء المحلي عند الفراغ', () => {
    const local = emptyData()
    local.settings.profile = { name: 'محلي', school: '', semester: 'الفصل الأول' }
    const merged = mergeCloudIntoLocal(local, {}, { name: 'سحابي', school: 'مدرسة', semester: '' })
    expect(merged.settings.profile).toEqual({ name: 'سحابي', school: 'مدرسة', semester: 'الفصل الأول' })
  })
})

describe('تحويل الصفوف من وإلى الجدول', () => {
  const plan = makePlan({ id: 'plan-x-001', title: 'خطة تجريبية' })

  it('toRow يبني صفًا سليمًا بمعرف ومستخدم ونوع وبيانات', () => {
    const row = toRow('plan', plan, 'user-1')
    expect(row.id).toBe('plan-x-001')
    expect(row.user_id).toBe('user-1')
    expect(row.kind).toBe('plan')
    expect(row.title).toBe('خطة تجريبية')
    expect((row.data as { id: string }).id).toBe('plan-x-001')
  })

  it('normalizeCloudRow يطبّع المستند ويهمل التالف والنوع المجهول', () => {
    const res = normalizeCloudRow('plan', plan)
    expect(res?.kind).toBe('plan')
    expect((res?.doc as { title: string }).title).toBe('خطة تجريبية')
    expect(normalizeCloudRow('unknown-kind', plan)).toBeNull()
    expect(normalizeCloudRow('plan', null)).toBeNull()
    expect(normalizeCloudRow('plan', 'not-an-object')).toBeNull()
  })

  it('normalizeRowDoc تصفّر الصف الغريب وصف الإعدادات بأمان', () => {
    expect(normalizeRowDoc(null)).toBeNull()
    expect(normalizeRowDoc(undefined)).toBeNull()
    expect(normalizeRowDoc({ kind: 'plan', data: plan })).not.toBeNull()
    expect(normalizeRowDoc({ kind: 'settings', data: {} })).toBeNull()
  })
})

// ============ السياق والواجهة ============

function Probe() {
  const cloud = useCloud()
  return (
    <div>
      <span data-testid="status">{cloud.status}</span>
      <span data-testid="available">{String(cloud.cloudAvailable)}</span>
    </div>
  )
}

describe('CloudContext', () => {
  it('بلا مكتبة CDN الحالة تنتهي إلى unavailable بلا انفجار', () => {
    render(
      <CloudProvider>
        <Probe />
      </CloudProvider>,
    )
    // بعد تشغيل التأثير: unavailable (المكتبة غائبة) أو loading قبل التأثير
    const status = screen.getByTestId('status')
    expect(['unavailable', 'loading']).toContain(status.textContent)
  })

  it('التطبيق كاملًا يعمل مع CloudProvider (المزامنة اختيارية ولا تعطل شيئًا)', () => {
    render(<App />)
    expect(screen.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeTruthy()
  })
})
