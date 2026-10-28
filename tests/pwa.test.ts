import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// اختبارات ملف تعريف التطبيق (PWA): صلاحية الـ manifest ووجود ملفات الأيقونات
const root = process.cwd()

describe('ملف تعريف التطبيق (PWA)', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'))

  it('يحتوي الحقول الأساسية المطلوبة', () => {
    expect(manifest.name).toBe('معلّم بلس | Moallem Plus')
    expect(manifest.short_name).toBe('معلّم بلس')
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
    expect(manifest.display).toBe('standalone')
    expect(manifest.dir).toBe('rtl')
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('يعلن أيقونات 192 و512 وأيقونة maskable موجودة فعلًا على القرص', () => {
    const icons: Array<{ src: string; sizes: string; purpose?: string }> = manifest.icons
    expect(icons.some((i) => i.sizes === '192x192' && i.purpose !== 'maskable')).toBe(true)
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose !== 'maskable')).toBe(true)
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true)
    for (const icon of icons) {
      const p = resolve(root, 'public', icon.src.replace(/^\.\//, ''))
      expect(existsSync(p), `الأيقونة غير موجودة: ${icon.src}`).toBe(true)
    }
  })

  it('أيقونة أيفون 180 موجودة ومرتبطة في index.html مع رابط الـ manifest', () => {
    expect(existsSync(resolve(root, 'public/icons/apple-touch-icon.png'))).toBe(true)
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    expect(html).toContain('manifest.webmanifest')
    expect(html).toContain('apple-touch-icon')
    expect(html).toContain('icons/apple-touch-icon.png')
    expect(html).toContain('theme-color')
  })
})
