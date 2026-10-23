import { Component, type ReactNode } from 'react'
import { IconAlert } from './icons'

// ============ حاجز الأخطاء ============
// إذا انهار جزء من التطبيق، تظهر رسالة معقولة بدل شاشة فارغة.

interface ErrorBoundaryState {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : undefined }
  }

  componentDidCatch(error: unknown) {
    // للمساعدة في التشخيص من وحدة التحكم
    console.error('[moallem-plus] خطأ غير متوقع:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          <IconAlert className="mb-3 h-10 w-10 text-rose-500" />
          <h1 className="mb-2 text-xl font-bold">حدث خطأ غير متوقع</h1>
          <p className="mb-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            عذرًا — تعطّل جزء من التطبيق. بياناتك المحلية ليست متأثرة بالخطأ.
          </p>
          {this.state.message && (
            <code className="mb-4 max-w-md overflow-hidden rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {this.state.message}
            </code>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            إعادة تحميل التطبيق
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
