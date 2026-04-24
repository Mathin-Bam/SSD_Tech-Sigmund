import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { phases } from './domain/seed'
import { useAuth } from './hooks/useAuth'
import { useFeatures } from './hooks/useFeatures'
import { useTeamMembers } from './hooks/useTeamMembers'
import { FeaturesPage } from './modules/features/FeaturesPage'
import { OverviewPage } from './modules/overview/OverviewPage'
import { RisksPage } from './modules/risks/RisksPage'
import { TeamPage } from './modules/team/TeamPage'
import { TimelinePage } from './modules/timeline/TimelinePage'
import { UploadsPage } from './modules/uploads/UploadsPage'
import { WelcomePage } from './modules/auth/WelcomePage'
import { LoginPage } from './modules/auth/LoginPage'
import { ProtectedRoute } from './modules/auth/ProtectedRoute'
import { OnboardingPage } from './modules/admin/OnboardingPage'

// ── Unauthenticated flow: Welcome → Login ─────────────────
function AuthFlow() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  if (!selectedProject) {
    return <WelcomePage onProjectSelect={setSelectedProject} />
  }

  return <LoginPage projectId={selectedProject} onBack={() => setSelectedProject(null)} />
}

// ── Authenticated dashboard ───────────────────────────────
function Dashboard() {
  const { role: authRole } = useAuth()
  const role: 'admin' | 'executive' = authRole ?? 'executive'

  // Live Supabase Hooks
  const { features, updateFeature, bulkUpsertFeatures } = useFeatures()
  const { teamMembers } = useTeamMembers()

  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell role={role} />}>
          <Route path="/" element={<OverviewPage features={features} phases={phases} role={role} />} />
          <Route
            path="/features"
            element={<FeaturesPage features={features} role={role} onUpdateFeature={updateFeature} />}
          />
          <Route path="/timeline" element={<TimelinePage features={features} phases={phases} />} />
          <Route path="/team" element={<TeamPage features={features} teamMembers={teamMembers} />} />
          <Route path="/risks" element={<RisksPage features={features} />} />
          <Route
            path="/onboarding"
            element={
              role === 'admin' ? (
                <OnboardingPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/uploads"
            element={
              role === 'admin' ? (
                <UploadsPage onMergeFeatures={bulkUpsertFeatures} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

// ── Root ─────────────────────────────────────────────────
function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(227,24,55,0.2)', borderTopColor: '#e31837', animation: 'app-spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthFlow />} />
      <Route path="/*" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
