/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' يجعل البناء يعمل على أي مسار: GitHub Pages (مستودع فرعي)، Render، أو أي خادم ثابت
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // النشر يعتمد على manifest.webmanifest المكتوب يدويًا في public/ — نمنع توليد نسخة ثانية
      manifest: false,
      // لا عامل خدمة في بيئة التطوير
      devOptions: { enabled: false },
      // التسجيل يدوي في main.tsx بشروط: الإنتاج فقط + خارج إطارات المعاينة (iframe)
      // + استثناء مسارات تسجيل الدخول وروابط OAuth
      injectRegister: false,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // الصفحات (التنقل): الشبكة أولًا مع مهلة قصيرة ثم الكاش
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/(login|oauth|signin|signup|auth|callback)(\/|$)/i],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-network-first',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // الأصول ذات الأسماء المتغيرة (hash): التخزين أولًا
            urlPattern: /\/assets\/.+\.(js|css|woff2?|png|jpe?g|svg|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hashed-assets-cache-first',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
})
