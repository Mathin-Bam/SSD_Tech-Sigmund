import { useEffect, useMemo, useState } from 'react'
import { deadlineAlerts } from '../../domain/rules'
import type { Feature } from '../../domain/types'
import { Badge, ExternalLinkButton, Section } from '../../shared/ui/components'
import { useUpdateLogs } from '../../hooks/useUpdateLogs'
import { FeatureEditForm, type FeatureUpdateFields } from './FeatureEditForm'

export function FeaturesPage({
  features,
  role,
  onUpdateFeature,
}: {
  features: Feature[]
  role: 'executive' | 'admin'
  onUpdateFeature: (featureId: string, patch: FeatureUpdateFields) => void
}) {
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const { logs, addLog } = useUpdateLogs(selectedId)

  const phases = useMemo(() => Array.from(new Set(features.map((f) => f.phaseName))), [features])

  const rows = useMemo(() => {
    return features.filter((f) => {
      if (search && !f.featureName.toLowerCase().includes(search.toLowerCase())) return false
      if (phaseFilter !== 'All' && f.phaseName !== phaseFilter) return false
      if (stageFilter !== 'All' && f.stage !== stageFilter) return false
      if (riskFilter !== 'All' && f.onTrackStatus !== riskFilter) return false
      return true
    })
  }, [features, phaseFilter, riskFilter, search, stageFilter])

  const selected = rows.find((f) => f.featureId === selectedId)

  useEffect(() => {
    setSelectedId(null)
    setEditOpen(false)
  }, [role])

  function handleRowClick(f: Feature) {
    setSelectedId(f.featureId)
    if (role === 'admin') {
      setEditOpen(true)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Feature Tracker</h1>
          <p>Full feature registry with filters, status, and assignment tracking.</p>
        </div>
        <span className="page-header-badge">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>view_list</span>
          {rows.length} / {features.length} shown
        </span>
      </div>

      <Section title="Feature Registry">
        <div className="toolbar">
          <div style={{ position: 'relative' }}>
            <span
              className="material-symbols-rounded"
              style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-muted)', pointerEvents: 'none' }}
            >
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features…"
              style={{ paddingLeft: '2.1rem' }}
            />
          </div>
          <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
            <option>All</option>
            {phases.map((phase) => <option key={phase}>{phase}</option>)}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option>All</option>
            <option>Design</option><option>Development</option><option>Testing</option>
            <option>Deployment</option><option>Done</option>
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option>All</option>
            <option>On Track</option><option>Slight Risk</option><option>At Risk</option>
            <option>Delayed</option><option>Completed</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Feature</th>
                <th>Phase</th>
                <th>Assignee</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>On Track</th>
                <th>Current Task</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr
                  key={f.featureId}
                  onClick={() => handleRowClick(f)}
                  style={selectedId === f.featureId ? { background: 'rgba(227,24,55,0.06)' } : undefined}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>{f.featureId}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{f.featureName}</td>
                  <td>{f.phaseName}</td>
                  <td>{f.assignedTo}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-secondary)',
                    }}>
                      {f.stage}
                    </span>
                  </td>
                  <td>{f.status}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${f.progress}%` }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.progress}%</span>
                    </div>
                  </td>
                  <td>{f.plannedDeadline}</td>
                  <td>
                    <Badge
                      label={f.onTrackStatus}
                      tone={
                        f.onTrackStatus === 'On Track' || f.onTrackStatus === 'Completed'
                          ? 'success'
                          : f.onTrackStatus === 'Delayed'
                          ? 'danger'
                          : 'warn'
                      }
                    />
                  </td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 180, whiteSpace: 'normal', fontSize: '0.8rem' }}>
                    {f.currentTask}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {role === 'admin' ? (
          <p className="table-hint">
            <span className="material-symbols-rounded" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>touch_app</span>
            Click a row to open the editor.
          </p>
        ) : null}
      </Section>

      {selected && !editOpen ? (
        <Section title={`Details: ${selected.featureName}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Owner', value: selected.owner },
              { label: 'Priority', value: selected.priority },
              { label: 'Phase', value: selected.phaseName },
              { label: 'Last Updated', value: `${selected.lastUpdatedBy} (${selected.lastUpdatedAt})` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>

          {selected.executiveSummary ? <p className="exec-summary">{selected.executiveSummary}</p> : null}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{selected.description}</p>
          <p className="small" style={{ marginTop: '0.5rem' }}>
            Dependencies: {selected.dependencies.join(', ') || 'None'} &nbsp;·&nbsp; Blocker: {selected.blockerNote || 'None'}
          </p>
          <div className="row-gap">
            {deadlineAlerts(selected).map((alert) => (
              <Badge
                key={alert.type}
                label={alert.label}
                tone={alert.type === 'overdue' ? 'danger' : alert.type === 'blocked' ? 'warn' : 'info'}
              />
            ))}
          </div>
          <div className="row-gap feature-links" style={{ marginTop: '0.75rem' }}>
            {selected.mvpUrl ? <ExternalLinkButton href={selected.mvpUrl}>Open MVP / Demo</ExternalLinkButton> : null}
            {selected.srsRequirementId ? (
              /^https?:\/\//i.test(selected.srsRequirementId) ? (
                <ExternalLinkButton href={selected.srsRequirementId}>SRS Document</ExternalLinkButton>
              ) : (
                <Badge label={`SRS: ${selected.srsRequirementId}`} tone="info" />
              )
            ) : null}
            {role === 'admin' && selected.githubPrUrl ? <ExternalLinkButton href={selected.githubPrUrl}>GitHub PR</ExternalLinkButton> : null}
            {role === 'admin' && selected.internalNotes ? (
              <p className="internal-notes"><strong>Internal:</strong> {selected.internalNotes}</p>
            ) : null}
          </div>

          {role === 'admin' && (
            <div className="row-gap" style={{ marginTop: '0.75rem' }}>
              <button type="button" onClick={() => setEditOpen(true)}>
                <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>edit</span>
                Edit Feature
              </button>
            </div>
          )}

          {/* Activity Feed */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Activity History
            </p>
            {logs.length === 0 ? (
              <p className="small" style={{ opacity: 0.5 }}>No activity logged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                    <span className="material-symbols-rounded" style={{ 
                      fontSize: 16, 
                      color: log.changeType === 'github_push' ? '#10b981' : '#3b82f6',
                      marginTop: 2,
                      flexShrink: 0
                    }}>
                      {log.changeType === 'github_push' ? 'commit' : 'edit_note'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.4, margin: 0 }}>{log.note}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 6 }}>
                        <span>{log.changedBy}</span>
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      ) : null}

      <FeatureEditForm
        feature={selected ?? null}
        open={editOpen && role === 'admin'}
        onClose={() => setEditOpen(false)}
        onSave={onUpdateFeature}
        onLogUpdate={(fid, note) => addLog(fid, note, 'manual')}
      />
    </div>
  )
}
