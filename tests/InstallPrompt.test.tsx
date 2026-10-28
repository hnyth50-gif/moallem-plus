// ============ اختبارات نافذة إعلام التثبيت (InstallPrompt) ============

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { InstallPrompt } from '../src/components/InstallPrompt'
import { INSTALL_PROMPT_KEY } from '../src/lib/storage'

// نتجاوز شرط «الإنتاج فقط/خارج الإطارات» حتى نتمكن من اختبار السلوك
vi.mock('../src/lib/install', () => ({ installUiAllowed: () => true }))

// مطابقة واجهة matchMedia الهمية (setup.ts): display-mode غير مطابق → التطبيق غير مثبت

let originalUserAgent = ''

beforeEach(() => {
  window.localStorage.clear()
  originalUserAgent = window.navigator.userAgent
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  Object.defineProperty(window.navigator, 'userAgent', {
    value: originalUserAgent,
    configurable: true,
  })
})

// إطلاق حدث beforeinstallprompt بحدث وهمي يحمل prompt/userChoice كالمتصفح الحقيقي
function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt') as Event & {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  e.prompt = vi.fn().mockResolvedValue(undefined)
  e.userChoice = Promise.resolve({ outcome })
  window.dispatchEvent(e)
  return e
}

// هل تظهر النافذة خلال مهلة قصيرة؟ (لاختبار الاكتمام السلبي)
async function pollVisibility(withinMs = 500): Promise<boolean> {
  const start = Date.now()
  for (;;) {
    if (screen.queryByRole('status')) return true
    if (Date.now() - start >= withinMs) return false
    await new Promise((r) => setTimeout(r, 50))
  }
}

describe('نافذة التثبيت (Chromium)', () => {
  it('تظهر عند إطلاق beforeinstallprompt وزر «تثبيت الآن» يستدعي prompt ويكتم النافذة نهائيًا', async () => {
    render(<InstallPrompt delayMs={10} />)
    expect(screen.queryByRole('status')).toBeNull() // لا شيء قبل الحدث

    const e = fireInstallPrompt('accepted')

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(screen.getByText('ثبّت «معلّم بلس» على جهازك')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'تثبيت الآن' }))

    await waitFor(() => expect(e.prompt).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(window.localStorage.getItem(INSTALL_PROMPT_KEY)).toBe('installed'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('زر «لاحقًا» يخفي النافذة ويحفظ زمن الرفض فيمنع ظهورها مجددًا', async () => {
    const { unmount } = render(<InstallPrompt delayMs={10} />)
    fireInstallPrompt('dismissed')
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'لاحقًا' }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())

    // زمن الرفض محفوظ كرقم
    const stored = Number(window.localStorage.getItem(INSTALL_PROMPT_KEY))
    expect(Number.isFinite(stored)).toBe(true)

    // حتى مع إعادة إطلاق الحدث بعد تجديد الواجهة تبقى مكتومة
    unmount()
    render(<InstallPrompt delayMs={10} />)
    window.dispatchEvent(new Event('beforeinstallprompt'))
    expect(await pollVisibility(500)).toBe(false)
  })

  it('يغلق زر X النافذة مع حفظ زمن الرفض', async () => {
    render(<InstallPrompt delayMs={10} />)
    fireInstallPrompt()
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق تنبيه التثبيت' }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(Number.isFinite(Number(window.localStorage.getItem(INSTALL_PROMPT_KEY)))).toBe(true)
  })
})

describe('نافذة التثبيت (آيفون/سفاري)', () => {
  it('تظهر تعليمات «إضافة إلى الشاشة الرئيسية» دون حاجة لحدث المتصفح، و«فهمت» يخفيها', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })

    render(<InstallPrompt delayMs={10} />)
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(screen.getByText('أضف «معلّم بلس» إلى شاشتك الرئيسية')).toBeTruthy()
    expect(screen.getByText(/إضافة إلى الشاشة الرئيسية/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'فهمت' }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(Number.isFinite(Number(window.localStorage.getItem(INSTALL_PROMPT_KEY)))).toBe(true)
  })
})
