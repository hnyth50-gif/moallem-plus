/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' يجعل البناء يعمل على أي مسار: GitHub Pages (مستودع فرعي)، Render، أو أي خادم ثابت
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
})
