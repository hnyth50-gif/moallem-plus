// ============ اختبارات حقول التاريخ (اتجاه سليم + صياغة عربية صريحة) ============

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import App from '../src/App'
import { formatIsoDateAr, formatDateForPrint } from '../src/lib/format'

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
})

describe('formatIsoDateAr', () => {
  it('يصوغ التاريخ بالعربية الصريحة: يوم باسم الشهر كاملًا وسنة بأرقام غربية', () => {
    const out = formatIsoDateAr('2026-11-05')
    expect(out).toMatch(/^5 نوفمبر 2026$/)
  })

  it('يرجع سلسلة فارغة للقيم الفارغة أو غير الصالحة', () => {
    expect(formatIsoDateAr('')).toBe('')
    expect(formatIsoDateAr(undefined)).toBe('')
    expect(formatIsoDateAr('not-a-date')).toBe('')
  })
})

describe('حقل تاريخ الحصة في محرر الخطة', () => {
  it('حقل التاريخ باتجاه ltr كي لا تنعكس مقاطع اليوم/الشهر في الواجهة العربية', () => {
    window.location.hash = '#/plans/new'
    render(<App />)
    const input = document.querySelector('#plan-date') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.getAttribute('dir')).toBe('ltr')
  })

  it('التلميح يعرض التاريخ المختار بالعربية الصريحة فور التغيير', () => {
    window.location.hash = '#/plans/new'
    render(<App />)
    // قبل الاختيار: تلميح إرشادي
    expect(screen.getByText('اختر اليوم من تقويم المتصفح')).toBeTruthy()
    fireEvent.change(document.querySelector('#plan-date') as HTMLInputElement, { target: { value: '2026-11-05' } })
    expect(screen.getByText('يقابل: 5 نوفمبر 2026')).toBeTruthy()
  })
})

describe('حقل تاريخ الإصدار في محرر الشهادة', () => {
  it('باتجاه ltr مع تلميح عربي حي', () => {
    window.location.hash = '#/certificates/new'
    render(<App />)
    const input = document.querySelector('#cert-date') as HTMLInputElement
    expect(input.getAttribute('dir')).toBe('ltr')
    fireEvent.change(input, { target: { value: '2026-12-14' } })
    expect(screen.getByText('يقابل: 14 ديسمبر 2026')).toBeTruthy()
  })
})

describe('تاريخ الطباعة يبقى واضحًا', () => {
  it('ترويسة الطباعة تعرض التاريخ بالعربية لا بصيغة ISO المعكوسة', () => {
    expect(formatDateForPrint('2026-11-05')).toMatch(/نوفمبر/)
    expect(formatDateForPrint('2026-11-05')).not.toMatch(/^\d{4}-/)
    expect(formatDateForPrint(undefined)).toBe('—————')
  })
})
