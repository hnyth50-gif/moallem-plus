// ============ اختبارات صفحة أدوات الصف ============
// المفكرة الأسبوعية (إضافة/ربط/حذف/تخزين) + المؤقت الصفي (عدّ تنازلي وخطوات) + المؤشرات + formatClock.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import App from '../src/App'
import { emptyData } from '../src/lib/store'
import { STORAGE_KEY } from '../src/lib/storage'
import { makePlan, makeActivity, makeQuiz, makeQuestion } from './helpers'
import { formatClock } from '../src/lib/format'
import type { AppData } from '../src/lib/types'

function seedWith(mutate: (d: AppData) => void): void {
  const data = emptyData()
  mutate(data)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function renderAppAt(hash: string) {
  window.location.hash = hash
  return render(<App />)
}

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#/'
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
  document.documentElement.className = ''
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('formatClock', () => {
  it('ينسّق م:ث ويسبق بصفر ويمنع السالب', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(-3)).toBe('00:00')
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(3600 + 65)).toBe('1:01:05')
  })
})

describe('المفكرة الأسبوعية', () => {
  it('تضيف مهمة مربوطة بخطة وتفتحها بالنقر، وتُحفظ بين الجلسات', () => {
    seedWith((d) => {
      d.plans = [makePlan()]
    })
    renderAppAt('#/tools')

    // التبويب الافتراضي: المفكرة الأسبوعية
    expect(screen.getByRole('tab', { name: 'المفكرة الأسبوعية', selected: true })).toBeTruthy()

    // إضافة مهمة في الأحد
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مهمة في يوم الأحد' }))
    fireEvent.change(screen.getByLabelText(/^عنوان المهمة/), { target: { value: 'حصة الأعداد النسبية' } })
    fireEvent.change(screen.getByLabelText('الحصة أو الوقت'), { target: { value: 'الحصة الثالثة' } })
    fireEvent.change(screen.getByLabelText('النوع'), { target: { value: 'plan' } })
    fireEvent.change(screen.getByLabelText(/^العنصر المرتبط/), { target: { value: 'plan-0001' } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))

    // الظهور في عمود الأحد مع شارة النوع
    expect(screen.getByText('خطة درس الأعداد النسبية')).toBeTruthy()
    expect(screen.getByText(/الحصة الثالثة/)).toBeTruthy()

    // النقر على المهمة ينتقل إلى محرر الخطة
    fireEvent.click(screen.getByRole('button', { name: /خطة: خطة درس الأعداد النسبية/ }))
    expect(window.location.hash).toBe('#/plans/plan-0001')

    // التخزين: جلسة جديدة تجد المهمة
    cleanup()
    renderAppAt('#/tools')
    expect(screen.getByText('خطة درس الأعداد النسبية')).toBeTruthy()
  })

  it('حذف المهمة وتفريغ الأسبوع يعملان', () => {
    seedWith((d) => {
      d.plans = [makePlan()]
    })
    renderAppAt('#/tools')

    fireEvent.click(screen.getByRole('button', { name: 'إضافة مهمة في يوم الاثنين' }))
    fireEvent.change(screen.getByLabelText(/^عنوان المهمة/), { target: { value: 'مهمة حرة للتجربة' } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
    expect(screen.getByText('مهمة حرة للتجربة')).toBeTruthy()

    // حذف فردي
    fireEvent.click(screen.getByRole('button', { name: 'حذف مهمة حرة للتجربة' }))
    expect(screen.queryByText('مهمة حرة للتجربة')).toBeNull()

    // إضافة اثنتين ثم تفريغ الأسبوع كاملًا
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مهمة في يوم الأحد' }))
    fireEvent.change(screen.getByLabelText(/^عنوان المهمة/), { target: { value: 'أولى' } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مهمة في يوم الثلاثاء' }))
    fireEvent.change(screen.getByLabelText(/^عنوان المهمة/), { target: { value: 'ثانية' } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
    expect(screen.getByText('أولى')).toBeTruthy()
    expect(screen.getByText('ثانية')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /تفريغ الأسبوع/ }))
    fireEvent.click(screen.getByRole('button', { name: 'تفريغ' }))
    expect(screen.queryByText('أولى')).toBeNull()
    expect(screen.queryByText('ثانية')).toBeNull()
    expect(screen.getAllByText('لا مهام').length).toBe(5)
  })

  it('تطلب عنوانًا للمهمة (تحقق من صحة النموذج)', () => {
    renderAppAt('#/tools')
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مهمة في يوم الأحد' }))
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
    expect(screen.getByText('أدخل عنوان المهمة')).toBeTruthy()
  })
})

describe('المؤقت الصفي', () => {
  it('مؤقت حر: يعد تنازليًا ويعلن انتهاء الوقت', () => {
    vi.useFakeTimers()
    renderAppAt('#/tools?tab=timer')

    fireEvent.change(screen.getByLabelText('الدقائق'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('الثواني'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ' }))

    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 00:05' })).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 00:03' })).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText('انتهى الوقت')).toBeTruthy()
    // زر البدء معطّل بعد الانتهاء
    expect((screen.getByRole('button', { name: 'ابدأ' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('إيقاف مؤقت ثم متابعة، والتصفير يعيد البداية', () => {
    vi.useFakeTimers()
    renderAppAt('#/tools?tab=timer')

    fireEvent.change(screen.getByLabelText('الدقائق'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('الثواني'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ' }))
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 00:45' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'إيقاف مؤقت' }))
    expect(screen.getByText('متوقف مؤقتًا')).toBeTruthy()
    // الزمن لا يتقدم أثناء التوقف
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 00:45' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 00:35' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'تصفير المؤقت' }))
    expect(screen.getByRole('timer', { name: 'الوقت المتبقي 01:00' })).toBeTruthy()
  })

  it('خطوات نشاط: تُحمّل من رابط عميق وتتقدم خطوةً خطوة', () => {
    vi.useFakeTimers()
    seedWith((d) => {
      d.activities = [makeActivity()]
    })
    renderAppAt('#/tools?tab=timer&activity=activity-0001')

    // وضع الخطوات مفعّل تلقائيًا من الرابط العميق
    expect(screen.getAllByText('نشاط فكر – زاوج – شارك').length).toBeGreaterThan(0)
    expect(screen.getByText('الخطوة 1 من 2')).toBeTruthy()
    expect(screen.getByText('طرح السؤال')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ' }))
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 500)
    })
    expect(screen.getByText(/انتهت الخطوة/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'الخطوة التالية' }))
    expect(screen.getByText('الخطوة 2 من 2')).toBeTruthy()
    expect(screen.getByText('النقاش الثنائي')).toBeTruthy()
    // الخطوة الأخيرة لا تعرض سطر «التالي»
    expect(screen.queryByText(/^التالي:/)).toBeNull()
  })
})

describe('المؤشرات', () => {
  it('تحسب أرقامًا حقيقية من البيانات: المكتبة والتوزيعات وآخر التعديلات', () => {
    seedWith((d) => {
      d.plans = [makePlan()] // 45 دقيقة
      d.activities = [makeActivity()]
      d.quizzes = [
        makeQuiz({
          questions: [
            makeQuestion({ id: 'q-1', difficulty: 'easy' }),
            makeQuestion({ id: 'q-2', kind: 'tf', options: [], difficulty: 'easy' }),
            makeQuestion({ id: 'q-3', difficulty: 'hard', points: 3 }),
          ],
        }),
      ]
    })
    renderAppAt('#/tools?tab=insights')

    expect(screen.getByText('حجم المكتبة')).toBeTruthy()
    expect(screen.getByText('45')).toBeTruthy() // دقائق الخطط
    expect(screen.getByText('توزيع صعوبة الأسئلة')).toBeTruthy()
    expect(screen.getByText('توزيع أنواع الأسئلة')).toBeTruthy()
    expect(screen.getByText('خطة درس الأعداد النسبية')).toBeTruthy() // آخر التعديلات
    // شارة النوع في آخر التعديلات
    expect(screen.getAllByText('خطة').length).toBeGreaterThan(0)
  })

  it('حالة فارغة واضحة عند عدم وجود بيانات', () => {
    renderAppAt('#/tools?tab=insights')
    expect(screen.getByText('لا بيانات بعد')).toBeTruthy()
  })
})

describe('تبويبات صفحة الأدوات', () => {
  it('التبديل بين التبويبات يعمل عبر aria-selected', () => {
    renderAppAt('#/tools')
    fireEvent.click(screen.getByRole('tab', { name: 'المؤقت الصفي' }))
    expect(screen.getByRole('tab', { name: 'المؤقت الصفي', selected: true })).toBeTruthy()
    expect(screen.getByLabelText('الدقائق')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'المفكرة الأسبوعية' }))
    expect(screen.getByRole('button', { name: 'إضافة مهمة في يوم الأحد' })).toBeTruthy()
  })
})
