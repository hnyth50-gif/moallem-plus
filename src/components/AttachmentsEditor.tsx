import { useRef, useState } from 'react'
import type { Attachment } from '../lib/types'
import { makeId } from '../lib/id'
import { useToast } from '../state/ToastContext'
import {
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  ATTACH_KIND_META,
  formatFileSize,
  getFileBlob,
  newFileAttachment,
  parseYouTubeId,
  putFileBlob,
  youtubeWatchUrl,
} from '../lib/attachments'
import { Badge, Button, IconBadge, Textarea } from './UI'
import { IconCopy, IconDownload, IconFile, IconPaperclip, IconTrash, IconYouTube } from './icons'
import { PaperSection } from './PrintFrame'
import { cn } from '../lib/cn'

// ============ مرفقات المستندات ============
// ثلاثة أنواع: ملف (يُخزَّن محتواه في IndexedDB دون اتصال)، نص منسوخ، ورابط يوتيوب.

type AddMode = 'none' | 'text' | 'youtube'

export function AttachmentsEditor({
  value,
  onChange,
}: {
  value: Attachment[]
  onChange: (next: Attachment[]) => void
}) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<AddMode>('none')
  const [textDraft, setTextDraft] = useState('')
  const [ytDraft, setYtDraft] = useState('')
  const [ytError, setYtError] = useState<string | null>(null)

  const add = (attachment: Attachment) => {
    if (value.length >= MAX_ATTACHMENTS) {
      toast(`الحد الأقصى ${MAX_ATTACHMENTS} مرفقات لكل مستند.`)
      return
    }
    onChange([...value, attachment])
  }

  const remove = (id: string) => {
    onChange(value.filter((a) => a.id !== id))
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast('حجم الملف يتجاوز الحد الأقصى (5 ميجابايت).', 'error')
      return
    }
    const meta = newFileAttachment(file)
    try {
      await putFileBlob(meta.id, file)
      add(meta)
      toast(`أُرفق الملف «${file.name}».`)
    } catch {
      toast('تعذر تخزين الملف على هذا الجهاز.', 'error')
    }
  }

  const saveText = () => {
    const text = textDraft.trim()
    if (!text) {
      toast('ألصق نصًا أولًا.', 'error')
      return
    }
    add({ id: makeId(), kind: 'text', text: text.slice(0, MAX_TEXT_LENGTH) })
    setTextDraft('')
    setMode('none')
    toast('أُرفق النص المنسوخ.')
  }

  const saveYouTube = () => {
    const videoId = parseYouTubeId(ytDraft)
    if (!videoId) {
      setYtError('الرابط ليس رابط يوتيوب صالحًا')
      return
    }
    setYtError(null)
    add({ id: makeId(), kind: 'youtube', url: youtubeWatchUrl(videoId), videoId })
    setYtDraft('')
    setMode('none')
    toast('أُرفق فيديو يوتيوب.')
  }

  const openFile = async (a: Attachment) => {
    try {
      const blob = await getFileBlob(a.id)
      if (!blob) {
        toast('لم يُعثر على محتوى الملف على هذا الجهاز.', 'error')
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = a.name || 'مرفق'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch {
      toast('تعذر فتح الملف.', 'error')
    }
  }

  const copyText = async (a: Attachment) => {
    try {
      await navigator.clipboard.writeText(a.text ?? '')
      toast('نُسخ النص إلى الحافظة.')
    } catch {
      toast('تعذر النسخ من هذا المتصفح.', 'error')
    }
  }

  const full = value.length >= MAX_ATTACHMENTS

  return (
    <section aria-labelledby="attachments-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="attachments-heading" className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <IconPaperclip className="h-4 w-4 text-brand-600 dark:text-brand-300" /> المرفقات
          <Badge>{value.length}</Badge>
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">ملف · نص منسوخ · رابط يوتيوب</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={full} onClick={() => fileInputRef.current?.click()}>
          <IconFile className="h-4 w-4" /> رفع ملف
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => setMode(mode === 'text' ? 'none' : 'text')}
          aria-expanded={mode === 'text'}
        >
          <IconCopy className="h-4 w-4" /> نص منسوخ
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => setMode(mode === 'youtube' ? 'none' : 'youtube')}
          aria-expanded={mode === 'youtube'}
        >
          <IconYouTube className="h-4 w-4" /> رابط يوتيوب
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            void onPickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {mode === 'text' && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <Textarea
            aria-label="النص المنسوخ"
            rows={4}
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="ألصق هنا النص المنسوخ (قصة، فقرة، نص قراءة...)..."
            maxLength={MAX_TEXT_LENGTH}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={saveText}>
              إرفاق النص
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('none')}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {mode === 'youtube' && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <input
            type="url"
            dir="ltr"
            aria-label="رابط يوتيوب"
            value={ytDraft}
            onChange={(e) => {
              setYtDraft(e.target.value)
              setYtError(null)
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={cn(
              'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
              ytError ? 'border-rose-400 dark:border-rose-600' : 'border-slate-300 dark:border-slate-600',
            )}
          />
          {ytError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{ytError}</p>}
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={saveYouTube}>
              إرفاق الفيديو
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('none')}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <IconBadge size="sm">
                {a.kind === 'file' ? <IconFile /> : a.kind === 'youtube' ? <IconYouTube /> : <IconCopy />}
              </IconBadge>
              <div className="min-w-0 flex-1">
                {a.kind === 'file' ? (
                  <>
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{a.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{a.size ? formatFileSize(a.size) : ''}</p>
                  </>
                ) : a.kind === 'youtube' ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="block truncate text-sm font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
                  >
                    {a.url}
                  </a>
                ) : (
                  <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">{a.text}</p>
                )}
              </div>
              {a.kind === 'file' && (
                <Button variant="ghost" size="icon" aria-label={`تنزيل ${a.name ?? 'الملف'}`} title="تنزيل" onClick={() => void openFile(a)}>
                  <IconDownload className="h-4 w-4" />
                </Button>
              )}
              {a.kind === 'text' && (
                <Button variant="ghost" size="icon" aria-label="نسخ النص" title="نسخ النص" onClick={() => void copyText(a)}>
                  <IconCopy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                aria-label={`إزالة ${ATTACH_KIND_META[a.kind].label}`}
                title="إزالة"
                onClick={() => remove(a.id)}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        الملفات تُخزَّن على جهازك فقط (حتى 5 ميجابايت للملف) ولا تُدخل في نسخة النسخ الاحتياطي؛ النصوص وروابط يوتيوب تُصدَّر مع البيانات.
      </p>
    </section>
  )
}

/**
 * قسم مرفقات ورقة الطباعة: أسماء الملفات، النصوص كاملة، وروابط يوتيوب
 */
export function PaperAttachments({ attachments }: { attachments: Attachment[] | undefined }) {
  if (!attachments || attachments.length === 0) return null
  const files = attachments.filter((a) => a.kind === 'file')
  const texts = attachments.filter((a) => a.kind === 'text')
  const videos = attachments.filter((a) => a.kind === 'youtube')
  return (
    <PaperSection title="المرفقات والمصادر الرقمية">
      <ul className="paper-ul">
        {videos.map((a) => (
          <li key={a.id}>
            فيديو تعليمي: <span dir="ltr">{a.url}</span>
          </li>
        ))}
        {files.map((a) => (
          <li key={a.id}>ملف: {a.name}</li>
        ))}
        {texts.map((a) => (
          <li key={a.id} className="whitespace-pre-wrap">{a.text}</li>
        ))}
      </ul>
    </PaperSection>
  )
}
