import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature, Blocker } from '../../domain/types'
import { useFlagLogs } from '../../hooks/useFlagLogs'

export interface FeatureStatusSheetProps {
  isOpen: boolean
  onClose: () => void
  feature: Feature | null
  blockers?: Blocker[]
  onFlag?: (featureId: string, reason: string, flag: boolean) => Promise<void>
}

export function FeatureStatusSheet({ isOpen, onClose, feature, blockers = [], onFlag }: FeatureStatusSheetProps) {
  const [flagMode, setFlagMode] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { logs, loading: logsLoading } = useFlagLogs(feature?.featureId)

  if (!isOpen || !feature) return null

  const displayDeadline = feature.revisedDeadline ?? feature.plannedDeadline
  const formattedDeadline = displayDeadline
    ? new Date(displayDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not set'

  const handleSubmitFlag = async () => {
    if (!onFlag || !flagReason.trim()) return
    setSubmitting(true)
    try {
      await onFlag(feature.featureId, flagReason.trim(), true)
      setFlagMode(false)
      setFlagReason('')
    } catch (err) {
      console.error('Flag failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveFlag = async () => {
    if (!onFlag) return
    setSubmitting(true)
    try {
      await onFlag(feature.featureId, '', false)
    } catch (err) {
      console.error('Remove flag failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const activeBlockers = blockers.filter(b => b.featureId === feature.featureId && b.status !== 'Resolved')

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-surface)', width: '100%', maxWidth: '450px', height: '100%', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.08))', animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-base)', margin: 0 }}>{feature.featureName}</h2>
              {feature.isFlagged && (
                <span title="Flagged for review" style={{ fontSize: '1rem' }}>🚩</span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phase: {feature.phaseName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* If already flagged — show the reason */}
          {feature.isFlagged && (
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>🚩 Flagged for Review</p>
              {feature.flagReason && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{feature.flagReason}</p>}
              {onFlag && (
                <button
                  onClick={handleRemoveFlag}
                  disabled={submitting}
                  style={{ marginTop: '0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', padding: '0.3rem 0.75rem', borderRadius: 6, cursor: 'pointer' }}
                >
                  {submitting ? 'Removing…' : 'Remove Flag'}
                </button>
              )}
            </div>
          )}

          {/* Active Blockers */}
          {activeBlockers.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#ef4444' }}>warning</span>
                Active Blockers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeBlockers.map(b => (
                  <div key={b.id} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-base)' }}>{b.title}</span>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#ef4444', fontWeight: 700, padding: '0.15rem 0.4rem', background: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>{b.severity}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{b.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Status: {b.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status / Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>Status</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-base)' }}>{feature.status}</p>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>Target Date</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-base)' }}>{formattedDeadline}</p>
            </div>
          </div>

          {/* Executive Summary */}
          {feature.executiveSummary && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-base)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>description</span>
                Executive Summary
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
                {feature.executiveSummary}
              </p>
            </div>
          )}

          {/* Subtasks */}
          {feature.subtasks && feature.subtasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-base)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>checklist</span>
                Task Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {feature.subtasks.map(st => (
                  <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'default' }}>
                    <input type="checkbox" checked={st.completed} readOnly disabled style={{ margin: 0, width: '1.1rem', height: '1.1rem', accentColor: 'var(--brand-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', color: st.completed ? 'var(--text-muted)' : 'var(--text-base)', textDecoration: st.completed ? 'line-through' : 'none', flex: 1, textAlign: 'left', lineHeight: 1.4 }}>
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Flag History Ledger */}
          {!logsLoading && logs.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-base)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#10b981' }}>history</span>
                Flag Resolution History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)', marginLeft: '0.5rem', paddingLeft: '1rem' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', left: '-1.35rem', top: '0.35rem', border: '2px solid var(--bg-surface)' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Resolved by {log.resolvedBy} on {new Date(log.resolvedAt).toLocaleDateString()}
                    </p>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason: {log.flagReason}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-base)' }}>{log.resolutionNote}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Flag for Review */}
        {onFlag && !feature.isFlagged && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
            {!flagMode ? (
              <button
                onClick={() => setFlagMode(true)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>flag</span>
                Flag for Review
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <textarea
                  autoFocus
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  placeholder="Describe the issue or concern…"
                  rows={3}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: 'var(--text-base)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setFlagMode(false); setFlagReason('') }} style={{ flex: 1, padding: '0.55rem', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmitFlag} disabled={submitting || !flagReason.trim()} style={{ flex: 1, padding: '0.55rem', borderRadius: 8, background: '#ef4444', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: submitting || !flagReason.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !flagReason.trim() ? 0.6 : 1 }}>
                    {submitting ? 'Submitting…' : 'Submit Flag'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>
    </div>,
    document.body
  )
}
