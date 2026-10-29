// ============ عميل Supabase (السحابة) ============
// المكتبة تُحمَّل عبر وسم CDN في index.html فيتوفر النطاق window.supabase.
// الإعدادات تأتي من متغيرات البناء VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY:
// - مفتاح «النشر العام» (publishable) فقط هو الذي يعيش في الواجهة — وهو مصمم ليكون ظاهرًا،
//   والحماية الحقيقية للبيانات عبر سياسات RLS على الجدول في لوحة تحكم Supabase.
// - المفتاح السري (secret / service_role) لا يُكتب في الواجهة ولا في المستودع إطلاقًا.
// إن غاب الإعداد أو تعذر تحميل المكتبة (دون اتصال) تعمل التطبيق محليًا كالمعتاد.

import type { SupabaseClient, SupabaseGlobal } from './supabaseTypes'

let cached: SupabaseClient | null | undefined

/** هل تتوفر إعدادات السحابة في هذا البناء؟ */
export function cloudConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}

/** هل مكتبة الـ CDN متوفرة في هذه الصفحة؟ */
export function cdnAvailable(): boolean {
  const g = (window as unknown as { supabase?: Partial<SupabaseGlobal> }).supabase
  return Boolean(g && typeof g.createClient === 'function')
}

/**
 * يعيد عميل Supabase المفرد، أو null عندما:
 * لا توجد إعدادات بناء، أو تعذر تحميل مكتبة الـ CDN (دون اتصال أو محجوبة).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  cached = null
  if (!cloudConfigured() || !cdnAvailable()) return cached
  const globalSupabase = (window as unknown as { supabase?: SupabaseGlobal }).supabase
  try {
    cached = globalSupabase!.createClient(
      String(import.meta.env.VITE_SUPABASE_URL),
      String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    )
  } catch {
    cached = null
  }
  return cached
}

/** تصفير العميل المفرد (عند عودة الاتصال بعد فشل تحميل CDN، وللاختبارات) */
export function resetSupabaseClient(): void {
  cached = undefined
}
