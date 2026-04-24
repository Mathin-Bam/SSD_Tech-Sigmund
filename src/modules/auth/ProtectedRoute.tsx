import { type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children?: ReactNode
  requiredRole?: 'admin' | 'executive'
}

const spinnerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#080d1a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const ringStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '3px solid rgba(227,24,55,0.2)',
  borderTopColor: '#e31837',
  animation: 'pr-spin 0.75s linear infinite',
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div style={spinnerStyle}>
        <style>{`@keyframes pr-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={ringStyle} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  // If used as a layout route (no children), render the Outlet
  return children ? <>{children}</> : <Outlet />
}
