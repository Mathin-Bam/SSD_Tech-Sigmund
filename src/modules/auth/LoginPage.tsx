import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px);  }
    50%       { transform: translateY(-5px); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);    opacity: 0.55; }
    70%  { transform: scale(1.38); opacity: 0;    }
    100% { transform: scale(1.38); opacity: 0;    }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px);  }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px);  }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .login-root {
    min-height: 100vh;
    background: #080d1a;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    position: relative;
    overflow: hidden;
  }

  /* Grid bg */
  .login-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
    animation: fadeIn 1s ease forwards;
  }

  /* Glow blob */
  .login-root::after {
    content: '';
    position: absolute;
    bottom: -100px;
    right: -100px;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(227,24,55,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 40px 36px;
    animation: fadeInUp 0.6s ease forwards;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset;
  }

  /* Top edge highlight */
  .login-card::before {
    content: '';
    position: absolute;
    top: 0; left: 10%; right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(227,24,55,0.5), transparent);
    border-radius: 100%;
  }

  /* ── Brand ── */
  .login-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 36px;
  }

  .login-logo-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .login-logo-ring {
    position: absolute;
    inset: -7px;
    border-radius: 19px;
    border: 2px solid rgba(227,24,55,0.4);
    animation: pulse-ring 2.5s ease-out infinite;
  }
  .login-logo {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: #e31837;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-size: 19px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    box-shadow: 0 0 24px rgba(227,24,55,0.45), 0 4px 16px rgba(0,0,0,0.5);
    animation: float 4.5s ease-in-out infinite;
  }

  .login-brand-text { text-align: center; }
  .login-brand-name {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    display: block;
    letter-spacing: -0.3px;
    margin-bottom: 2px;
  }
  .login-brand-sub {
    font-size: 13px;
    color: #64748b;
    display: block;
  }

  /* Project badge */
  .login-project-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    border-radius: 100px;
    font-size: 11.5px;
    font-weight: 500;
    color: #3b82f6;
    animation: fadeIn 0.8s 0.2s ease both;
  }
  .login-project-badge .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 13px;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  /* ── Divider ── */
  .login-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    animation: fadeIn 0.6s 0.15s ease both;
  }
  .login-divider span {
    font-size: 11px;
    font-weight: 500;
    color: #475569;
    white-space: nowrap;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .login-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.07);
  }

  /* ── Form ── */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: fadeInUp 0.6s 0.1s ease both;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .form-label {
    font-size: 12.5px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.01em;
  }
  .form-input-wrap {
    position: relative;
  }
  .form-input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 17px;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    color: #475569;
    pointer-events: none;
    user-select: none;
  }
  .form-input {
    width: 100%;
    height: 44px;
    padding: 0 14px 0 40px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #f1f5f9;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    box-sizing: border-box;
  }
  .form-input::placeholder { color: #475569; }
  .form-input:focus {
    border-color: rgba(227,24,55,0.5);
    box-shadow: 0 0 0 3px rgba(227,24,55,0.1);
    background: rgba(255,255,255,0.08);
  }

  /* Submit btn */
  .login-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 46px;
    width: 100%;
    border: none;
    border-radius: 10px;
    background: #e31837;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    margin-top: 4px;
    box-shadow: 0 4px 16px rgba(227,24,55,0.3);
    letter-spacing: 0.01em;
  }
  .login-submit:hover:not(:disabled) {
    background: #c41230;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(227,24,55,0.45);
  }
  .login-submit:active:not(:disabled) {
    transform: translateY(0);
  }
  .login-submit:disabled {
    background: rgba(227,24,55,0.35);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* Spinner inline */
  .btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* Error */
  .login-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(227,24,55,0.08);
    border: 1px solid rgba(227,24,55,0.22);
    border-radius: 8px;
    font-size: 13px;
    color: #fb7185;
    animation: shake 0.4s ease;
    line-height: 1.45;
  }
  .login-error .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 16px;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* Back link */
  .login-back {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 24px;
    font-size: 12.5px;
    color: #475569;
    cursor: pointer;
    background: none;
    border: none;
    font-family: 'Inter', sans-serif;
    transition: color 0.18s ease;
    padding: 0;
    animation: fadeIn 0.6s 0.4s ease both;
  }
  .login-back:hover { color: #94a3b8; }
  .login-back .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 15px;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
`

const PROJECT_NAMES: Record<string, string> = {
  default: 'Project workspace',
  'ssd-tech-tracker': 'SSD-Tech Project Tracker',
  'acp-hospital': 'ACP Hospital Management System & Infrastructure',
}

interface LoginPageProps {
  projectId: string
  onBack: () => void
}

export function LoginPage({ projectId, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState(0)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setErrorKey((k) => k + 1)
      setLoading(false)
    } else {
      setLoading(false)
    }
    // On success: AuthContext.onAuthStateChange fires → App.tsx redirects automatically
  }

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo-wrap">
              <div className="login-logo-ring" />
              <div className="login-logo">ssd</div>
            </div>
            <div className="login-brand-text">
              <span className="login-brand-name">ssd-tech</span>
              <span className="login-brand-sub">Project Tracker</span>
            </div>
            <div className="login-project-badge">
              <span className="material-symbols-rounded">folder</span>
              {PROJECT_NAMES[projectId] ?? 'Project workspace'}
            </div>
          </div>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span>Sign in to continue</span>
            <div className="login-divider-line" />
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <div className="form-input-wrap">
                <span className="form-input-icon">mail</span>
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@ssd-tech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="form-input-wrap">
                <span className="form-input-icon">lock</span>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="login-error" key={errorKey} role="alert">
                <span className="material-symbols-rounded">error</span>
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="login-submit"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Back */}
          <button className="login-back" onClick={onBack} type="button" id="login-back-btn">
            <span className="material-symbols-rounded">arrow_back</span>
            Back to project selection
          </button>
        </div>
      </div>
    </>
  )
}
