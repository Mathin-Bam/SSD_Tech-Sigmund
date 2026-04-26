import { useState, type FormEvent } from 'react'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { Badge, Section } from '../../shared/ui/components'
import { supabase } from '../../lib/supabase'

export function OnboardingPage() {
  const { teamMembers, loading, deactivateMember } = useTeamMembers()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [portalRole, setPortalRole] = useState<'admin' | 'executive' | 'dev'>('dev')
  const [jobTitle, setJobTitle] = useState('Fullstack Developer')
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const jobTitles = [
    'Backend Developer',
    'Frontend Developer',
    'Fullstack Developer',
    'QA Engineer',
    'Project Manager',
  ]

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviting(true)
    setMsg(null)
    try {
      console.log('Invoking admin-create-user with:', { email, fullName, role: portalRole, jobTitle })
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email, password, fullName, role: portalRole, jobTitle },
      })

      console.log('Edge function response:', { data, error })

      if (error) {
        console.error('Edge function error:', error)
        throw new Error(error.message || 'Edge function invocation failed')
      }

      if (data && data.error) {
        throw new Error(data.error)
      }

      setMsg({ text: `Account created for ${fullName} (${email})`, type: 'success' })
      setEmail('')
      setFullName('')
      setPassword('')
      setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to create user', type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  async function handleDeactivate(id: string, name: string) {
    if (window.confirm(`Remove ${name} from the project?`)) {
      try {
        await deactivateMember(id)
      } catch (err: any) {
        setMsg({ text: err.message || 'Failed to remove member', type: 'error' })
      }
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const roleBadgeStyle = (r: string) => {
    if (r === 'admin') return { bg: '#e31837', color: '#fff', border: 'none' }
    if (r === 'dev') return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
    return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Team Onboarding</h1>
          <p>Create accounts for developers and manage team access.</p>
        </div>
        <span className="page-header-badge">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>person_add</span>
          {teamMembers.length} active members
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Create User Form */}
        <Section title="Create Team Member">
          <form className="edit-form" onSubmit={handleCreateUser}>
            <label>
              Full Name
              <input 
                required 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="e.g. John Doe"
              />
            </label>
            <label>
              Email Address
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="john@ssd-tech.com"
              />
            </label>
            <label>
              Password
              <input 
                required 
                type="password" 
                minLength={6}
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Minimum 6 characters"
              />
            </label>
            <label>
              Dashboard Access
              <select
                value={portalRole}
                onChange={(e) => setPortalRole(e.target.value as 'admin' | 'executive' | 'dev')}
                aria-label="Portal role for sign-in"
              >
                <option value="dev">Developer (features & timeline)</option>
                <option value="executive">Executive (client portal)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </label>
            <label>
              Job title (roster)
              <select value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} aria-label="Job title on team roster">
                {jobTitles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {msg && (
              <div 
                role="alert"
                aria-live="polite"
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: 8, 
                  fontSize: '0.85rem',
                  background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: msg.type === 'success' ? '#10b981' : '#ef4444',
                  border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                }}
              >
                {msg.text}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={inviting} style={{ width: '100%' }} aria-busy={inviting}>
                {inviting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Section>

        {/* Active Members Table */}
        <Section title="Active Members">
          {loading ? (
            <p className="small">Loading members...</p>
          ) : teamMembers.length === 0 ? (
            <p className="small" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No team members onboarded yet. Create one using the form.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(member => (
                    <tr key={member.userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            width: 32, height: 32, borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.05)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
                            border: '1px solid var(--border)'
                          }}>
                            {getInitials(member.name)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{member.name}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: '0.85rem' }}>{member.role}</span></td>
                      <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{member.department}</span></td>
                      <td>
                        <Badge 
                          label={member.availability} 
                          tone={member.availability === 'Available' ? 'success' : member.availability === 'Near Capacity' ? 'warn' : 'danger'} 
                        />
                      </td>
                      <td>
                        <button 
                          className="btn-ghost" 
                          onClick={() => handleDeactivate(member.userId, member.name)}
                          style={{ color: '#ef4444', padding: '4px 8px' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
