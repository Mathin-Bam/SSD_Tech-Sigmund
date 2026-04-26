import React, { useState } from 'react'
import { Section } from '../../shared/ui/components'
import { usePhases } from '../../hooks/usePhases'

import type { Phase } from '../../domain/types'

export function PhaseManager() {
  const { phases, loading, error, createPhase, updatePhase, deletePhase } = usePhases()
  const [phaseName, setPhaseName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [owner, setOwner] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Phase>>({})

  if (loading) return <p>Loading phases...</p>
  if (error) return <p style={{ color: '#ff4444' }}>Error: {error}</p>

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createPhase({ phaseName, startDate, targetDate, owner })
      setPhaseName('')
      setStartDate('')
      setTargetDate('')
      setOwner('')
    } catch (err) {
      console.error(err)
      alert('Failed to create phase')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (phase: Phase) => {
    setEditingPhaseId(phase.phaseId)
    setEditForm({
      phaseName: phase.phaseName,
      startDate: phase.startDate,
      targetDate: phase.targetDate,
      owner: phase.owner
    })
  }

  const handleSaveEdit = async () => {
    if (!editingPhaseId) return
    try {
      await updatePhase(editingPhaseId, editForm)
      setEditingPhaseId(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update phase')
    }
  }

  const handleCancelEdit = () => {
    setEditingPhaseId(null)
    setEditForm({})
  }

  return (
    <Section title="Phase Management" style={{ marginTop: '2rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Manage project phases and their global deadlines. Features will inherit target dates from their assigned phase.
      </p>

      <div style={{ marginBottom: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>Phase Name</th>
              <th style={{ padding: '0.75rem' }}>Start Date</th>
              <th style={{ padding: '0.75rem' }}>Target Date</th>
              <th style={{ padding: '0.75rem' }}>Owner</th>
              <th style={{ padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {phases.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No phases defined yet.
                </td>
              </tr>
            ) : (
              phases.map(p => {
                const isEditing = editingPhaseId === p.phaseId
                return (
                  <tr key={p.phaseId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input 
                          value={editForm.phaseName || ''} 
                          onChange={e => setEditForm({ ...editForm, phaseName: e.target.value })} 
                          style={{ padding: '0.4rem', width: '100%', borderRadius: '4px', border: '1px solid var(--brand-primary)', background: 'var(--bg-elevated)', color: 'white' }} 
                        />
                      ) : p.phaseName}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editForm.startDate || ''} 
                          onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} 
                          style={{ padding: '0.4rem', width: '100%', borderRadius: '4px', border: '1px solid var(--brand-primary)', background: 'var(--bg-elevated)', color: 'white', colorScheme: 'dark' }} 
                        />
                      ) : p.startDate}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={editForm.targetDate || ''} 
                          onChange={e => setEditForm({ ...editForm, targetDate: e.target.value })} 
                          style={{ padding: '0.4rem', width: '100%', borderRadius: '4px', border: '1px solid var(--brand-primary)', background: 'var(--bg-elevated)', color: 'white', colorScheme: 'dark' }} 
                        />
                      ) : p.targetDate}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <input 
                          value={editForm.owner || ''} 
                          onChange={e => setEditForm({ ...editForm, owner: e.target.value })} 
                          style={{ padding: '0.4rem', width: '100%', borderRadius: '4px', border: '1px solid var(--brand-primary)', background: 'var(--bg-elevated)', color: 'white' }} 
                        />
                      ) : p.owner}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={handleSaveEdit} style={{ background: 'transparent', color: '#22c55e', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                          <button onClick={handleCancelEdit} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button onClick={() => startEditing(p)} style={{ background: 'transparent', color: 'var(--brand-primary)', border: 'none', cursor: 'pointer' }}>Edit</button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Delete ${p.phaseName}?`)) {
                                deletePhase(p.phaseId)
                              }
                            }}
                            style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', alignItems: 'end', background: 'var(--bg-elevated)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Phase Name</label>
          <input required value={phaseName} onChange={e => setPhaseName(e.target.value)} placeholder="e.g. Phase 3" style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Start Date</label>
          <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', colorScheme: 'dark' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Target Date</label>
          <input type="date" required value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white', colorScheme: 'dark' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Owner</label>
          <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Nabila" style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'white' }} />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: '0.6rem', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', height: '37px' }}
        >
          {isSubmitting ? 'Adding...' : 'Add Phase'}
        </button>
      </form>
    </Section>
  )
}
