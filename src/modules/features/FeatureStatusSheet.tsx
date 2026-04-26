import React from 'react'
import { createPortal } from 'react-dom'
import type { Feature } from '../../domain/types'

export interface FeatureStatusSheetProps {
  isOpen: boolean
  onClose: () => void
  feature: Feature | null
}

export function FeatureStatusSheet({ isOpen, onClose, feature }: FeatureStatusSheetProps) {
  if (!isOpen || !feature) return null

  const displayDeadline = feature.revisedDeadline ?? feature.plannedDeadline
  const formattedDeadline = displayDeadline
    ? new Date(displayDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not set'

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-surface)',
          width: '100%',
          maxWidth: '450px',
          height: '100%',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-base)', marginBottom: '0.25rem' }}>{feature.featureName}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phase: {feature.phaseName}</p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              display: 'flex',
              padding: '0.25rem'
            }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
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

          {feature.subtasks && feature.subtasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-base)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}>checklist</span>
                Task Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {feature.subtasks.map(st => (
                  <label key={st.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: '6px', cursor: 'default' }}>
                    <input 
                      type="checkbox" 
                      checked={st.completed} 
                      readOnly 
                      disabled
                      style={{ marginTop: '0.15rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: st.completed ? 'var(--text-muted)' : 'var(--text-base)', textDecoration: st.completed ? 'line-through' : 'none' }}>
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}
