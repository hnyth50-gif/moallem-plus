// ============ تأسيس بيئة الاختبار ============
// jsdom لا يدعم matchMedia؛ واجهة متوافقة كافية لتطبيقنا (استماع change + matches).

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      const listeners = new Set<(e: MediaQueryListEvent) => void>()
      return {
        matches: false, // تفضيل النظام في الاختبارات = فاتح دائمًا
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
        addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
        removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
        dispatchEvent: () => true,
      }
    },
  })
}
