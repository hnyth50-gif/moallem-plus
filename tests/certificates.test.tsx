// ============ اختبارات شهادات الطلاب (القائمة والمحرر والطباعة) ============

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react'
import App from '../src/App'
import { STORAGE_KEY } from '../src/lib/storage'
import { emptyData } from '../src/lib/store'

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#/'
  document.documentElement.setAttribute('dir', 'rtl')
  document.documentElement.setAttribute('lang', 'ar')
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

function makeCertificate(overrides: Partial<Record<string, unknown>> = {}) {
  const now = Date.now()
  return {
    id: 'cert-1',
    type: 'excellence',
    studentName: 'سارة عبدالله الأحمد',
    grade: 'الصف الخامس الابتدائي',
    reason: 'لتفوقها المتميز في مادة العلوم.',
    dateISO: '2026-10-28',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function seedCertificates(certs: Array<Record<string, unknown>>) {
  const data = emptyData()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data.certificates = certs as any
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function openCertificates() {
  render(<App />)
  const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
  fireEvent.click(within(nav).getByRole('link', { name: /الشهادات/ }))
}

describe('قائمة الشهادات', () => {
  it('شهادة محفوظة تظهر باسم الطالب وشارة نوعها', () => {
    seedCertificates([makeCertificate()])
    openCertificates()
    expect(screen.getByText('سارة عبدالله الأحمد')).toBeTruthy()
    expect(screen.getByText('تفوق وامتياز')).toBeTruthy()
    expect(screen.getByText(/لتفوقها المتميز/)).toBeTruthy()
  })

  it('القائمة الفارغة تعرض حالة إرشادية بوضوح', () => {
    openCertificates()
    expect(screen.getByText('لا شهادات بعد')).toBeTruthy()
    expect(screen.getByText('إنشاء شهادة')).toBeTruthy()
  })

  it('حذف شهادة يزيلها من القائمة ومن localStorage', () => {
    seedCertificates([makeCertificate()])
    openCertificates()
    fireEvent.click(screen.getByRole('button', { name: /حذف شهادة سارة/ }))
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }))
    expect(screen.queryByText('سارة عبدالله الأحمد')).toBeNull()
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.certificates).toHaveLength(0)
  })
})

describe('محرر الشهادة', () => {
  it('المعاينة الحية تعرض عنوان النوع وتتبع اسم الطالب فور الكتابة', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    expect(screen.getByText('معاينة حية')).toBeTruthy()
    // العنوان الافتراضي: شكر وتقدير (يظهر في القائمة المنسدلة والمعاينة معًا)
    expect(screen.getAllByText('شهادة شكر وتقدير').length).toBeGreaterThan(0)
    const nameInput = screen.getByLabelText(/اسم الطالب\/ة/)
    fireEvent.change(nameInput, { target: { value: 'خالد فهد العمري' } })
    // الاسم يظهر في المعاينة الحية وطبقة الطباعة معًا
    expect(screen.getAllByText('خالد فهد العمري').length).toBe(2)
  })

  it('حفظ شهادة جديدة يخزنها محليًا ويعيد إلى القائمة', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    fireEvent.change(screen.getByLabelText(/اسم الطالب\/ة/), { target: { value: 'خالد فهد العمري' } })
    fireEvent.change(screen.getByLabelText(/سبب التقدير/), { target: { value: 'لحسن سلوكه المتميز.' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(window.location.hash).toBe('#/certificates')
    expect(screen.getByText('خالد فهد العمري')).toBeTruthy()
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.certificates).toHaveLength(1)
    expect(stored.certificates[0].studentName).toBe('خالد فهد العمري')
  })

  it('يمنع الحفظ دون اسم الطالب ويعرض رسالة الخطأ', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    fireEvent.change(screen.getByLabelText(/سبب التقدير/), { target: { value: 'سبب ما.' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    expect(screen.getByText(/أدخل اسم الطالب/)).toBeTruthy()
    expect(window.location.hash).toBe('#/certificates/new')
  })

  it('تبديل نوع الشهادة يغيّر عنوان المعاينة والشارة', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    const typeSelect = screen.getByLabelText(/نوع الشهادة/) as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'motivation' } })
    expect(screen.getAllByText('شهادة تحفيز وتشجيع').length).toBeGreaterThan(0)
    expect(screen.getByText('تحفيز وتشجيع')).toBeTruthy()
  })

  it('زر حفظ PDF يفتح نافذة الطباعة الأصلية بعد إرشاد المستخدم', () => {
    vi.useFakeTimers()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    window.location.hash = '#/certificates/new'
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /حفظ PDF/ }))
    expect(printSpy).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('طبقة الطباعة الأفقية (landscape) تُحقن في محرر الشهادة فقط', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    const styles = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '')
    expect(styles.some((t) => t.includes('A4 landscape'))).toBe(true)

    cleanup()
    window.location.hash = '#/certificates'
    render(<App />)
    const stylesList = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '')
    expect(stylesList.some((t) => t.includes('A4 landscape'))).toBe(false)
  })

  it('تحرير شهادة موجودة يعبّئ النموذج بقيمها', () => {
    seedCertificates([makeCertificate()])
    window.location.hash = '#/certificates/cert-1'
    render(<App />)
    const nameInput = screen.getByLabelText(/اسم الطالب\/ة/) as HTMLInputElement
    expect(nameInput.value).toBe('سارة عبدالله الأحمد')
    expect(screen.getAllByText('شهادة تفوق وامتياز').length).toBeGreaterThan(0)
  })
})
