// ============ اختبارات الواجهة العامة (App / توجيه RTL) ============

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import App from '../src/App'
import { STORAGE_KEY } from '../src/lib/storage'
import { emptyData } from '../src/lib/store'
import { makePlan } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  // hash يبقى محفوظًا بين اختبارات الملف الواحد — نعيده دائمًا للرئيسية
  window.location.hash = '#/'
  // افتراض بيئة عربية RTL كما في index.html
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
  document.documentElement.className = ''
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('الصفحة الرئيسية', () => {
  it('تعرض الترحيب العربي مع اتجاه RTL', () => {
    render(<App />)
    expect(screen.getByText(/مساحتك الموّحدة لإعداد الدروس/)).toBeTruthy()
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(window.location.hash).toBe('#/')
  })

  it('روابط التنقل الرئيسية ستة ظاهرة في الهيدر', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    for (const label of ['الرئيسية', 'خطط الدروس', 'الأنشطة', 'الاختبارات', 'بطاقات التفكير', 'الإعدادات']) {
      expect(within(nav).getByRole('link', { name: new RegExp(label) })).toBeTruthy()
    }
  })

  it('حالة البيانات الفارغة تحث البدء بوضوح', () => {
    render(<App />)
    expect(screen.getByText('ابدأ رحلتك التعليمية')).toBeTruthy()
    expect(screen.getByText(/لم تُنشئ أي عناصر بعد/)).toBeTruthy()
  })
})

describe('التنقل بين الشاشات', () => {
  it('الانتقال إلى قائمة الخطط يعرض الحالة الفارغة وزر الإنشاء', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    fireEvent.click(within(nav).getByRole('link', { name: /خطط الدروس/ }))
    expect(window.location.hash).toBe('#/plans')
    expect(screen.getByText('لا يوجد عناصر بعد')).toBeTruthy()
  })

  it('شاشة الإعدادات تظهر ملف المعلم', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    fireEvent.click(within(nav).getByRole('link', { name: /الإعدادات/ }))
    expect(window.location.hash).toBe('#/settings')
    // ترويسة الصفحة والروابط عدة تسجيلات للنص نفسه — يكفي وجوده
    expect(screen.getAllByText('الإعدادات').length).toBeGreaterThan(0)
    expect(screen.getByText(/ملفك، المظهر، ونسخك الاحتياطية/)).toBeTruthy()
  })

  it('مسار مجهول يعرض صفحة «غير موجود»', () => {
    window.location.hash = '#/lorem-ipsum-404'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'الصفحة غير موجودة' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'رجوع إلى الرئيسية' })).toBeTruthy()
  })
})

describe('تكامل البيانات عبر المكونات', () => {
  function openPlans() {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    fireEvent.click(within(nav).getByRole('link', { name: /خطط الدروس/ }))
  }

  it('خطة محفوظة مسبقًا في localStorage تظهر في قائمة الخطط', () => {
    const data = emptyData()
    data.plans = [makePlan({ title: 'خطة اختبار الواجهة' })]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

    openPlans()
    expect(screen.getByText('خطة اختبار الواجهة')).toBeTruthy()
    // حصة التفاصيل: قائمة عناصر ظاهرة
    expect(screen.getByRole('list', { name: 'قائمة العناصر' })).toBeTruthy()
  })

  it('عنصر تجريبي يظهر مع شارة «تجريبي»', () => {
    const data = emptyData()
    data.plans = [makePlan({ id: 'demo-0001-plan-test', demo: true, title: 'تجريبي: خطة الواجهة' })]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

    openPlans()
    expect(screen.getByText('تجريبي: خطة الواجهة')).toBeTruthy()
    expect(screen.getAllByText('تجريبي').length).toBeGreaterThan(0)
  })
})

describe('الوضع الداكن', () => {
  it('تفعيل الوضع الداكن من الإعدادات يضاف صنف dark إلى عنصر html', () => {
    // bootstrap المظهر من التخزين (كما يفعل السكربت في index.html)
    window.localStorage.setItem('moallem-plus:theme', 'dark')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('الوضع الفاتح يزيل صنف dark', () => {
    window.localStorage.setItem('moallem-plus:theme', 'light')
    render(<App />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
