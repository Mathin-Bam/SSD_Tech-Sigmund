import { useEffect, useState } from 'react'
import type { Feature } from '../../domain/types'
import { Section } from '../../shared/ui/components'
import { useTeamMembers } from '../../hooks/useTeamMembers'

export type FeatureUpdateFields = Pick<
  Feature,
  | 'progress'
  | 'internalNotes'
  | 'githubPrUrl'
  | 'mvpUrl'
  | 'srsRequirementId'
  | 'executiveSummary'
  | 'clientVisibility'
  | 'assignedTo'
>

export function FeatureEditForm({
  feature,
  open,
  onClose,
  onSave,
}: {
  feature: Feature | null
  open: boolean
  onClose: () => void
  onSave: (featureId: string, patch: FeatureUpdateFields) => void
}) {
  const { teamMembers } = useTeamMembers()
  const [progress, setProgress] = useState(0)
  const [internalNotes, setInternalNotes] = useState('')
  const [githubPrUrl, setGithubPrUrl] = useState('')
  const [mvpUrl, setMvpUrl] = useState('')
  const [srsRequirementId, setSrsRequirementId] = useState('')
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [clientVisibility, setClientVisibility] = useState(true)
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    if (!feature) return
    setProgress(feature.progress)
    setInternalNotes(feature.internalNotes ?? '')
    setGithubPrUrl(feature.githubPrUrl ?? '')
    setMvpUrl(feature.mvpUrl ?? '')
    setSrsRequirementId(feature.srsRequirementId ?? '')
    setExecutiveSummary(feature.executiveSummary ?? '')
    setClientVisibility(feature.clientVisibility)
    setAssignedTo(feature.assignedTo ?? '')
  }, [feature])

  if (!open || !feature) return null

  const editing = feature

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(editing.featureId, {
      progress,
      internalNotes: internalNotes.trim() || undefined,
      githubPrUrl: githubPrUrl.trim() || undefined,
      mvpUrl: mvpUrl.trim() || undefined,
      srsRequirementId: srsRequirementId.trim() || undefined,
      executiveSummary: executiveSummary.trim() || undefined,
      clientVisibility,
      assignedTo: assignedTo.trim(),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit feature ${editing.featureName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Section title={`Edit: ${editing.featureName}`} action={<button type="button" className="btn-ghost" onClick={onClose}>Close</button>}>
          <form className="edit-form" onSubmit={handleSubmit}>
            <label htmlFor="edit-progress">
              Progress (0–100)
              <input id="edit-progress" type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
              <span className="small">{progress}%</span>
            </label>
            <label htmlFor="edit-assignee">
              Assigned Developer
              <select id="edit-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {teamMembers.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="edit-summary">
              Executive summary
              <textarea id="edit-summary" value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} rows={3} placeholder="Client-facing status" />
            </label>
            <label htmlFor="edit-mvp">
              MVP / demo URL
              <input id="edit-mvp" value={mvpUrl} onChange={(e) => setMvpUrl(e.target.value)} placeholder="https://..." />
            </label>
            <label htmlFor="edit-srs">
              SRS requirement ID
              <input id="edit-srs" value={srsRequirementId} onChange={(e) => setSrsRequirementId(e.target.value)} placeholder="SRS-42" />
            </label>
            <label htmlFor="edit-github">
              GitHub PR URL (internal)
              <input id="edit-github" value={githubPrUrl} onChange={(e) => setGithubPrUrl(e.target.value)} placeholder="https://github.com/..." />
            </label>
            <label htmlFor="edit-notes">
              Internal notes
              <textarea id="edit-notes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} placeholder="Developer / blocker notes" />
            </label>
            <label className="checkbox-row" htmlFor="edit-visibility">
              <input id="edit-visibility" type="checkbox" checked={clientVisibility} onChange={(e) => setClientVisibility(e.target.checked)} />
              Visible in Executive view
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit">Save changes</button>
            </div>
          </form>
        </Section>
      </div>
    </div>
  )
}
