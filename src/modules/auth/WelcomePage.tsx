import { useState, useEffect } from 'react'

const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);    opacity: 0.6; }
    70%  { transform: scale(1.35); opacity: 0;   }
    100% { transform: scale(1.35); opacity: 0;   }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px);   }
    50%       { transform: translateY(-6px);  }
  }
  @keyframes grid-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes card-hover-glow {
    from { box-shadow: 0 0 0 0 rgba(227, 24, 55, 0); }
    to   { box-shadow: 0 0 32px 0 rgba(227, 24, 55, 0.18); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .welcome-root {
    min-height: 100vh;
    background: #080d1a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
    overflow: hidden;
  }

  /* Ambient background grid */
  .welcome-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 60px 60px;
    animation: grid-fade 1.2s ease forwards;
    pointer-events: none;
  }

  /* Radial glow from center */
  .welcome-root::after {
    content: '';
    position: absolute;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(227,24,55,0.07) 0%, transparent 70%);
    pointer-events: none;
  }

  .welcome-container {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 880px;
  }

  /* ── Brand ── */
  .welcome-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 56px;
    animation: fadeInUp 0.7s ease forwards;
  }

  .welcome-logo-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .welcome-logo-ring {
    position: absolute;
    inset: -8px;
    border-radius: 20px;
    border: 2px solid rgba(227, 24, 55, 0.45);
    animation: pulse-ring 2.4s ease-out infinite;
  }
  .welcome-logo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: #e31837;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    box-shadow: 0 0 32px rgba(227,24,55,0.4), 0 4px 20px rgba(0,0,0,0.6);
    animation: float 4s ease-in-out infinite;
  }

  .welcome-title {
    text-align: center;
  }
  .welcome-title h1 {
    font-size: 28px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.5px;
    margin: 0 0 4px;
  }
  .welcome-title .welcome-sigmund {
    background: linear-gradient(90deg, #e31837, #ff6b6b, #e31837);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }
  .welcome-title p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
    letter-spacing: 0.02em;
  }

  /* ── Section heading ── */
  .welcome-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 20px;
    align-self: flex-start;
    padding-left: 2px;
    animation: fadeIn 0.8s 0.3s ease both;
  }

  /* ── Project Grid ── */
  .welcome-projects {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    animation: fadeInUp 0.7s 0.2s ease both;
  }

  .project-card {
    position: relative;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 24px 22px;
    cursor: pointer;
    transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
    overflow: hidden;
  }
  .project-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(227,24,55,0.6), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .project-card:hover {
    transform: translateY(-3px);
    border-color: rgba(227,24,55,0.35);
    background: rgba(255,255,255,0.08);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(227,24,55,0.1);
  }
  .project-card:hover::before {
    opacity: 1;
  }
  .project-card.selected {
    border-color: rgba(227,24,55,0.6);
    background: rgba(227,24,55,0.06);
    box-shadow: 0 0 0 1px rgba(227,24,55,0.3), 0 8px 32px rgba(227,24,55,0.15);
  }
  .project-card.selected::before {
    opacity: 1;
  }

  .project-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .project-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 20px;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    flex-shrink: 0;
  }
  .project-icon.red    { background: rgba(227,24,55,0.15);  color: #e31837; }
  .project-icon.blue   { background: rgba(59,130,246,0.15); color: #3b82f6; }
  .project-icon.purple { background: rgba(167,139,250,0.15);color: #a78bfa; }

  .project-status-badge {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 100px;
    flex-shrink: 0;
  }
  .project-status-badge.active { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
  .project-status-badge.soon   { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); }
  .project-status-badge.planned{ background: rgba(100,116,139,0.15);color: #64748b; border: 1px solid rgba(100,116,139,0.2); }

  .project-name {
    font-size: 15px;
    font-weight: 600;
    color: #f1f5f9;
    line-height: 1.4;
    margin: 0 0 6px;
  }
  .project-desc {
    font-size: 12.5px;
    color: #64748b;
    line-height: 1.55;
    margin: 0 0 16px;
  }
  .project-meta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .project-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: #475569;
  }
  .project-meta-item .material-symbols-rounded {
    font-size: 14px;
  }

  .project-card-arrow {
    position: absolute;
    bottom: 20px;
    right: 18px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(227,24,55,0.12);
    color: #e31837;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', sans-serif;
    font-size: 16px;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .project-card:hover .project-card-arrow {
    opacity: 1;
    transform: translateX(0);
  }
  .project-card.selected .project-card-arrow {
    opacity: 1;
    transform: translateX(0);
    background: rgba(227,24,55,0.2);
  }

  /* ── CTA Button ── */
  .welcome-cta {
    margin-top: 36px;
    width: 100%;
    display: flex;
    justify-content: center;
    animation: fadeInUp 0.7s 0.35s ease both;
  }
  .cta-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 32px;
    height: 48px;
    border-radius: 12px;
    background: #e31837;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    box-shadow: 0 4px 20px rgba(227,24,55,0.35);
  }
  .cta-btn:hover:not(:disabled) {
    background: #c41230;
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(227,24,55,0.5);
  }
  .cta-btn:disabled {
    background: rgba(227,24,55,0.3);
    color: rgba(255,255,255,0.4);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .cta-btn .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', sans-serif;
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-size: 20px;
  }

  /* ── Footer ── */
  .welcome-footer {
    margin-top: 48px;
    text-align: center;
    font-size: 12px;
    color: #334155;
    animation: fadeIn 1s 0.6s ease both;
  }
  .welcome-footer span {
    color: #475569;
  }
`

interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'soon' | 'planned'
  icon: string
  iconColor: 'red' | 'blue' | 'purple'
  features: number
  team: number
}

const PROJECTS: Project[] = [
  {
    id: 'ssd-tech-tracker',
    name: 'SSD-Tech Project Tracker',
    description: 'Full project lifecycle management — features, milestones, risks, and team tracking.',
    status: 'active',
    icon: 'analytics',
    iconColor: 'red',
    features: 24,
    team: 6,
  },
  {
    id: 'acp-hospital',
    name: 'ACP-Hospital Management System & Infrastructure',
    description: 'End-to-end HMS platform covering patient records, billing, staff management and hospital infrastructure.',
    status: 'active',
    icon: 'local_hospital',
    iconColor: 'blue',
    features: 41,
    team: 9,
  },
]

const STATUS_LABEL: Record<Project['status'], string> = {
  active: 'Active',
  soon: 'Coming Soon',
  planned: 'Planned',
}

interface WelcomePageProps {
  onProjectSelect: (projectId: string) => void
}

export function WelcomePage({ onProjectSelect }: WelcomePageProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)

  // Animate cards in staggered
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set())
  useEffect(() => {
    PROJECTS.forEach((_, i) => {
      setTimeout(() => setVisibleCards((prev) => new Set([...prev, i])), 80 + i * 100)
    })
  }, [])

  const handleSelect = (id: string) => {
    if (PROJECTS.find((p) => p.id === id)?.status !== 'active') return
    setSelected(id)
  }

  const handleProceed = () => {
    if (!selected) return
    setEntering(true)
    setTimeout(() => onProjectSelect(selected), 480)
  }

  return (
    <>
      <style>{styles}</style>
      <div className="welcome-root" style={{ opacity: entering ? 0 : 1, transition: 'opacity 0.48s ease' }}>
        <div className="welcome-container">

          {/* Brand */}
          <div className="welcome-brand">
            <div className="welcome-logo-wrap">
              <div className="welcome-logo-ring" />
              <div className="welcome-logo">ssd</div>
            </div>
            <div className="welcome-title">
              <h1>
                SSD-Tech <span className="welcome-sigmund">Sigmund</span>
              </h1>
              <p>Intelligent Project Tracking Platform</p>
            </div>
          </div>

          {/* Section label */}
          <div className="welcome-section-label">Select a Project to Continue</div>

          {/* Project cards */}
          <div className="welcome-projects">
            {PROJECTS.map((project, i) => (
              <div
                key={project.id}
                className={`project-card${selected === project.id ? ' selected' : ''}`}
                style={{
                  opacity: visibleCards.has(i) ? 1 : 0,
                  transform: visibleCards.has(i) ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.45s ease, transform 0.45s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease`,
                  cursor: project.status !== 'active' ? 'not-allowed' : 'pointer',
                  filter: project.status !== 'active' ? 'grayscale(0.5) opacity(0.6)' : 'none',
                }}
                onClick={() => handleSelect(project.id)}
                role="button"
                aria-pressed={selected === project.id}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(project.id)}
              >
                <div className="project-card-header">
                  <div className={`project-icon ${project.iconColor}`}>
                    <span className="material-symbols-rounded">{project.icon}</span>
                  </div>
                  <span className={`project-status-badge ${project.status}`}>
                    {STATUS_LABEL[project.status]}
                  </span>
                </div>

                <h3 className="project-name">{project.name}</h3>
                <p className="project-desc">{project.description}</p>

                <div className="project-meta">
                  <div className="project-meta-item">
                    <span className="material-symbols-rounded">task_alt</span>
                    {project.features} features
                  </div>
                  <div className="project-meta-item">
                    <span className="material-symbols-rounded">group</span>
                    {project.team} members
                  </div>
                </div>

                <div className="project-card-arrow">
                  <span className="material-symbols-rounded">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="welcome-cta">
            <button
              className="cta-btn"
              disabled={!selected || entering}
              onClick={handleProceed}
              id="welcome-proceed-btn"
            >
              {entering ? (
                <>
                  <span
                    style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Entering…
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded">login</span>
                  Continue to Login
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="welcome-footer">
            <span>SSD-Tech Sigmund v1.0</span> · Powered by SSD-Tech Engineering
          </div>
        </div>
      </div>
    </>
  )
}
