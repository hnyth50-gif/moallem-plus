import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { restoreAccent } from './lib/accent'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('عنصر #root غير موجود في index.html')

// استرجاع لون الموقع المحفوظ (طبقة أمان إن لم يعمل سكربت الإقلاع في index.html)
restoreAccent()

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// تسجيل عامل الخدمة بشروط: الإنتاج فقط (لا في التطوير)،
// خارج إطارات المعاينة (iframe)، وباستثناء مسارات تسجيل الدخول وروابط OAuth
if (import.meta.env.PROD && window.self === window.top) {
  const excludedAuthPath = /\/(login|oauth|signin|signup|auth|callback)(\/|$)/i
  if (!excludedAuthPath.test(window.location.pathname)) {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
  }
}
