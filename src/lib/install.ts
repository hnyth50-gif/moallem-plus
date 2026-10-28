// ============ شروط إظهار واجهة التثبيت ============
// الإنتاج فقط، وخارج إطارات المعاينة (iframe) — نفس شروط تسجيل عامل الخدمة في main.tsx.
// في بيئة التطوير لا يوجد عامل خدمة أصلًا، فلا معنى لعرض تنبيه تثبيت.

export function installUiAllowed(): boolean {
  if (!import.meta.env.PROD) return false
  try {
    if (window.self !== window.top) return false
  } catch {
    /* تعذّر الوصول إلى window.top — نعتبره داخل إطار */
    return false
  }
  return true
}
