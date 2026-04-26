import { useState } from 'react'
import type { Feature, TeamMember } from '../../domain/types'
import { Badge, Section } from '../../shared/ui/components'
import { ChatBox } from './ChatBox'

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVAIL_COLORS: Record<string, string> = {
  Available:      'linear-gradient(135deg, #22c55e, #16a34a)',
  'Near Capacity': 'linear-gradient(135deg, #f59e0b, #d97706)',
  Overloaded:     'linear-gradient(135deg, #e31837, #c41230)',
}

export function TeamPage({ features, teamMembers }: { features: Feature[]; teamMembers: TeamMember[] }) {
  const [chatPeer, setChatPeer] = useState<TeamMember | null>(null)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Team Assignments</h1>
          <p>Current workload view and capacity status for each team member.</p>
        </div>
        <span className="page-header-badge">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>group</span>
          {teamMembers.length} members
        </span>
      </div>

      <Section title="Current Workload">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Current Assignment</th>
                <th>Stage</th>
                <th>Due Date</th>
                <th>Next Task</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const current = features.find((f) => f.assignedTo === member.name)
                const assignedCount = features.filter((f) => f.assignedTo === member.name).length
                return (
                  <tr key={member.userId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          className="team-avatar"
                          style={{ background: AVAIL_COLORS[member.availability] ?? AVAIL_COLORS['Near Capacity'] }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem' }}>{member.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: current ? 'var(--text-secondary)' : 'var(--text-faint)' }}>
                      {current?.featureName ?? '—'}
                    </td>
                    <td>{current?.stage ?? '—'}</td>
                    <td>{current?.plannedDeadline ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 160, whiteSpace: 'normal' }}>
                      {current?.nextTask ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Badge
                          label={member.availability}
                          tone={
                            member.availability === 'Available' ? 'success'
                            : member.availability === 'Overloaded' ? 'danger'
                            : 'warn'
                          }
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {assignedCount} feature{assignedCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setChatPeer(member)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(59,130,246,0.25)',
                          background: 'rgba(59,130,246,0.08)',
                          color: '#3b82f6',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59,130,246,0.18)'
                          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(59,130,246,0.08)'
                          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>chat</span>
                        Message
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Chat Modal */}
      <ChatBox
        isOpen={!!chatPeer}
        onClose={() => setChatPeer(null)}
        peer={chatPeer}
      />
    </div>
  )
}
