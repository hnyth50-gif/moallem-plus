import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ThemeProvider } from './state/ThemeContext'
import { ToastProvider } from './state/ToastContext'
import { CloudProvider } from './state/CloudContext'
import { DataProvider } from './state/DataContext'
import { Dashboard } from './pages/Dashboard'
import { PlansList, ActivitiesList, QuizzesList } from './pages/DocLists'
import { PlanEditor } from './pages/PlanEditor'
import { ActivityEditor } from './pages/ActivityEditor'
import { QuizEditor } from './pages/QuizEditor'
import { CardsPage, CardDetail, CardCreate, CardEdit } from './pages/CardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFound } from './pages/NotFound'
import { ToolsPage } from './pages/ToolsPage'
import { CertificatesPage } from './pages/CertificatesPage'
import { CertificateEditor } from './pages/CertificateEditor'
import { ErrorBoundary } from './components/ErrorBoundary'
import { InstallPrompt } from './components/InstallPrompt'

// ============ جذر التطبيق ============
// نستخدم HashRouter لأن الموقع ثابت على GitHub Pages الذي لا يدعم إعادة كتابة المسارات.

function Router() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plans" element={<PlansList />} />
          <Route path="/plans/new" element={<PlanEditor />} />
          <Route path="/plans/:id" element={<PlanEditor />} />
          <Route path="/activities" element={<ActivitiesList />} />
          <Route path="/activities/new" element={<ActivityEditor />} />
          <Route path="/activities/:id" element={<ActivityEditor />} />
          <Route path="/quizzes" element={<QuizzesList />} />
          <Route path="/quizzes/new" element={<QuizEditor />} />
          <Route path="/quizzes/:id" element={<QuizEditor />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/cards/new" element={<CardCreate />} />
          <Route path="/cards/:id" element={<CardDetail />} />
          <Route path="/cards/:id/edit" element={<CardEdit />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/certificates/new" element={<CertificateEditor />} />
          <Route path="/certificates/:id" element={<CertificateEditor />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

function Providers() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <CloudProvider>
            <DataProvider>
              <Router />
            </DataProvider>
          </CloudProvider>
        </ToastProvider>
      </ThemeProvider>
      {/* نافذة التثبيت مستقلة عن السياقات — ثابتة أسفل الشاشة */}
      <InstallPrompt />
    </ErrorBoundary>
  )
}

export default function App() {
  return <Providers />
}
