// ============ اختبارات دورة حياة مرفقات الملفات (استنساخ وتنظيف) ============

import { describe, it, expect } from 'vitest'
import type { Attachment } from '../src/lib/types'
import { cloneAttachments, removedFileIds } from '../src/lib/attachments'

describe('removedFileIds', () => {
  it('يعيد معرفات ملفات المزالة فقط (لا النصوص ولا يوتيوب ولا الباقية)', () => {
    const prev: Attachment[] = [
      { id: 'f1', kind: 'file', name: 'a.pdf' },
      { id: 'f2', kind: 'file', name: 'b.pdf' },
      { id: 't1', kind: 'text', text: 'نص' },
      { id: 'y1', kind: 'youtube', url: 'https://www.youtube.com/watch?v=abc12345', videoId: 'abc12345' },
    ]
    const next: Attachment[] = [
      { id: 'f2', kind: 'file', name: 'b.pdf' },
      { id: 't1', kind: 'text', text: 'نص' },
    ]
    expect(removedFileIds(prev, next)).toEqual(['f1'])
  })

  it('إزالة كل المرفقات تنظف كل ملفاتها، والسوابق الفارغة لا تنظف شيئًا', () => {
    const prev: Attachment[] = [{ id: 'f9', kind: 'file', name: 'x.docx' }]
    expect(removedFileIds(prev, [])).toEqual(['f9'])
    expect(removedFileIds(prev, undefined)).toEqual(['f9'])
    expect(removedFileIds(undefined, [])).toEqual([])
    expect(removedFileIds([], [])).toEqual([])
  })
})

describe('cloneAttachments', () => {
  it('يستنسخ المرفقات بمعرفات جديدة مع الحفاظ على النوع والمحتوى', async () => {
    const src: Attachment[] = [
      { id: 'f1', kind: 'file', name: 'a.pdf', size: 10, mime: 'application/pdf' },
      { id: 't1', kind: 'text', text: 'نص' },
      { id: 'y1', kind: 'youtube', url: 'https://www.youtube.com/watch?v=abc12345', videoId: 'abc12345' },
    ]
    const out = (await cloneAttachments(src)) ?? []
    expect(out).toHaveLength(3)
    expect(new Set(out.map((a) => a.id)).size).toBe(3)
    out.forEach((a, i) => {
      expect(a.id).not.toBe(src[i].id)
      expect(a.kind).toBe(src[i].kind)
    })
    expect(out[1].text).toBe('نص')
    expect(out[2].videoId).toBe('abc12345')
  })

  it('القائمة الفارغة أو الغائبة تعيد undefined — والبيئة بلا IndexedDB لا ترمي خطأً', async () => {
    expect(await cloneAttachments(undefined)).toBeUndefined()
    expect(await cloneAttachments([])).toBeUndefined()
    const src: Attachment[] = [{ id: 'f1', kind: 'file', name: 'a.pdf' }]
    const out = await cloneAttachments(src)
    expect(out).toHaveLength(1)
    expect(out?.[0].kind).toBe('file')
  })
})
