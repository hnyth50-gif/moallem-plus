// ============ اختبارات مرفقات المستندات (ملف / نص منسوخ / رابط يوتيوب) ============

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import App from '../src/App'
import { STORAGE_KEY } from '../src/lib/storage'
import { emptyData } from '../src/lib/store'
import { parseYouTubeId, youtubeWatchUrl, MAX_TEXT_LENGTH } from '../src/lib/attachments'
import { parseImport } from '../src/lib/validate'

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

function openNewPlan() {
  window.location.hash = '#/plans/new'
  render(<App />)
}

describe('parseYouTubeId', () => {
  it('يستخرج المعرّف من روابط watch وyoutu.be وshorts وembed وmusic', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeId('https://youtube.com/watch?app=desktop&v=abcDEF123_-')).toBe('abcDEF123_-')
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('يرفض الروابط غير الصالحة', () => {
    expect(parseYouTubeId('https://vimeo.com/123456')).toBeNull()
    expect(parseYouTubeId('https://www.youtube.com/playlist?list=PL123')).toBeNull()
    expect(parseYouTubeId('نص عشوائي ليس رابطًا')).toBeNull()
    expect(parseYouTubeId('')).toBeNull()
  })
})

describe('مرفقات محرر الخطة', () => {
  it('إضافة رابط يوتيوب تُظهره في القائمة ويُحفظ معرف الفيديو مع المستند', async () => {
    openNewPlan()
    // تعبئة الحقول المطلوبة
    fireEvent.change(screen.getByLabelText(/عنوان الدرس/), { target: { value: 'خطة بالمرفقات' } })
    fireEvent.change(screen.getByLabelText(/المادة/), { target: { value: 'علوم' } })
    fireEvent.change(screen.getByLabelText(/^الصف/), { target: { value: 'الصف الرابع' } })

    // فتح نموذج يوتيوب وإرفاق رابط
    fireEvent.click(screen.getByRole('button', { name: /رابط يوتيوب/ }))
    const ytInput = screen.getByLabelText('رابط يوتيوب')
    fireEvent.change(ytInput, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق الفيديو' }))

    // يظهر المرفق برابط المشاهدة القياسي (في القائمة وفي ورقة الطباعة)
    await waitFor(() => expect(screen.getAllByText(youtubeWatchUrl('dQw4w9WgXcQ')).length).toBeGreaterThan(0))

    // الحفظ يخزن المرفق في البيانات المحلية
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(raw as string) as any
      expect(data.plans).toHaveLength(1)
      expect(data.plans[0].attachments).toHaveLength(1)
      expect(data.plans[0].attachments[0]).toMatchObject({ kind: 'youtube', videoId: 'dQw4w9WgXcQ' })
    })
  })

  it('إضافة نص منسوخ تُظهره وتُحفظ نصه كاملًا', async () => {
    openNewPlan()
    fireEvent.change(screen.getByLabelText(/عنوان الدرس/), { target: { value: 'خطة بنص' } })
    fireEvent.change(screen.getByLabelText(/المادة/), { target: { value: 'لغة عربية' } })
    fireEvent.change(screen.getByLabelText(/^الصف/), { target: { value: 'الصف الخامس' } })

    fireEvent.click(screen.getByRole('button', { name: /نص منسوخ/ }))
    const textArea = screen.getByLabelText('النص المنسوخ')
    fireEvent.change(textArea, { target: { value: 'كان يا ما كان، في قديم الزمان...' } })
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق النص' }))

    expect(screen.getAllByText(/كان يا ما كان/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))
    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(raw as string) as any
      expect(data.plans[0].attachments[0]).toMatchObject({ kind: 'text', text: 'كان يا ما كان، في قديم الزمان...' })
    })
  })

  it('رابط يوتيوب غير صالح يُظهر رسالة خطأ ولا يُضاف', () => {
    openNewPlan()
    fireEvent.click(screen.getByRole('button', { name: /رابط يوتيوب/ }))
    fireEvent.change(screen.getByLabelText('رابط يوتيوب'), { target: { value: 'https://vimeo.com/999' } })
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق الفيديو' }))
    expect(screen.getByText('الرابط ليس رابط يوتيوب صالحًا')).toBeTruthy()
    // لا قائمة مرفقات بعد
    expect(screen.queryByText('المرفقات والمصادر الرقمية')).toBeNull()
  })

  it('إزالة مرفق من القائمة تحذفه قبل الحفظ', () => {
    openNewPlan()
    fireEvent.click(screen.getByRole('button', { name: /نص منسوخ/ }))
    fireEvent.change(screen.getByLabelText('النص المنسوخ'), { target: { value: 'نص مؤقت' } })
    fireEvent.click(screen.getByRole('button', { name: 'إرفاق النص' }))
    expect(screen.getAllByText(/نص مؤقت/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'إزالة نص منسوخ' }))
    expect(screen.queryByText(/نص مؤقت/)).toBeNull()  })
})

describe('تطبيع المرفقات عند الاستيراد', () => {
  it('يحفظ المرفقات السليمة ويسقط التالف منها', () => {
    const data = emptyData()
    const now = Date.now()
    data.plans.push({
      id: 'plan-att-01',
      kind: 'plan',
      title: 'مستوردة',
      subject: 'رياضيات',
      grade: 'الصف السادس',
      objectives: [],
      resources: [],
      sections: [],
      attachments: [
        { id: 'a1', kind: 'youtube', url: 'https://youtu.be/vid12345678', videoId: 'vid12345678' },
        { id: 'a2', kind: 'text', text: 'نص سليم' },
        { id: 'a3', kind: 'file', name: 'ورقة عمل.pdf', size: 2048, mime: 'application/pdf' },
        // تالف: يوتيوب بلا معرف صالح
        { id: 'a4', kind: 'youtube', url: 'https://example.com/nope' },
        // تالف: نص فارغ
        { id: 'a5', kind: 'text', text: '   ' },
      ],
      createdAt: now,
      updatedAt: now,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const parsed = parseImport(JSON.parse(JSON.stringify(data)))
    expect(parsed.ok).toBe(true)
    const plans = parsed.data?.plans ?? []
    expect(plans).toHaveLength(1)
    const atts = plans[0].attachments ?? []
    expect(atts).toHaveLength(3)
    expect(atts[0]).toMatchObject({ kind: 'youtube', videoId: 'vid12345678' })
    expect(atts[0].url).toBe(youtubeWatchUrl('vid12345678'))
    expect(atts[1]).toMatchObject({ kind: 'text', text: 'نص سليم' })
    expect(atts[2]).toMatchObject({ kind: 'file', name: 'ورقة عمل.pdf' })
  })

  it('يقصّ النص الطويل إلى الحد الأقصى ويتجاهل مصفوفة المرفقات غير الصالحة', () => {
    const data = emptyData()
    const now = Date.now()
    data.plans.push({
      id: 'plan-att-02',
      kind: 'plan',
      title: 'قصّ',
      subject: 'علوم',
      grade: 'الصف الأول',
      objectives: [],
      resources: [],
      sections: [],
      attachments: [{ id: 'a1', kind: 'text', text: 'و'.repeat(MAX_TEXT_LENGTH + 500) }],
      createdAt: now,
      updatedAt: now,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const parsed = parseImport(JSON.parse(JSON.stringify(data)))
    expect(parsed.ok).toBe(true)
    expect(parsed.data?.plans[0].attachments?.[0]?.text).toHaveLength(MAX_TEXT_LENGTH)  })
})
