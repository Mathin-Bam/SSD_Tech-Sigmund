import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature } from '../../domain/types'

export interface FlagResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  feature: Feature | null
  onResolve: (featureId: string, resolutionNote: string) => Promise<void>
}

export function FlagResolutionModal({ isOpen, onClose, feature, onResolve }: FlagResolutionModalProps) {
  const [resolutionNote, setResolutionNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !feature) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolutionNote.trim()) return

    setIsSubmitting(true)
    try {
      await onResolve(feature.featureId, resolutionNote.trim())
      setResolutionNote('')
      onClose()
    } catch (err: any) {
      console.error('Failed to resolve flag:', err)
      alert(`Save failed: ${err?.message ?? 'Unknown error'}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div 
      className="modal-backdrop" 
      role="presentation" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Resolve Flag"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(239,68,68,0.25)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(239,68,68,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🚩</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text, #f8fafc)' }}>
              Resolve Flag
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {feature.featureName}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              Client Reason
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5 }}>
              {feature.flagReason || 'No reason provided.'}
            </p>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
            Resolution Note
            <textarea 
              required
              autoFocus
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              placeholder="Explain how this flag is being addressed..."
              rows={4}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              style={{ 
                padding: '0.6rem 1rem', 
                borderRadius: '8px', 
                background: 'transparent', 
                color: 'var(--text-muted, #94a3b8)',
                border: '1px solid transparent',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !resolutionNote.trim()}
              style={{ 
                padding: '0.6rem 1.25rem', 
                borderRadius: '8px', 
                background: '#ef4444', 
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: (isSubmitting || !resolutionNote.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !resolutionNote.trim()) ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}
            >
              {isSubmitting ? 'Resolving...' : 'Resolve Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
