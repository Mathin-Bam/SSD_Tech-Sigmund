import { useMemo, useState } from 'react'
import type { Feature } from '../../domain/types'
import { Badge, Section } from '../../shared/ui/components'
import { parseUploadCsv, uploadTemplateHeaders } from './parser'

export function UploadsPage({ onMergeFeatures }: { onMergeFeatures: (features: Feature[]) => Promise<void> }) {
  const [text, setText] = useState(uploadTemplateHeaders())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const result = useMemo(() => {
    try {
      return parseUploadCsv(text)
    } catch (err: any) {
      return { records: [], errors: [err.message] }
    }
  }, [text])

  const handleApply = async () => {
    setLoading(true)
    setError(null)
    try {
      await onMergeFeatures(result.records)
      setShowConfirm(false)
      setText(uploadTemplateHeaders()) // Reset on success
      alert('Upload successful!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large (max 2MB)')
      return
    }

    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are allowed')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target?.result as string)
      setError(null)
    }
    reader.readAsText(file)
  }

  return (
    <div className="page">
      <Section title="Phase Upload Workflow">
        <p className="small">Upload order: create phase, add features, assign owners, set deadlines, update progress, mark risks, move stages, archive phase.</p>
        
        <div style={{ margin: '1rem 0' }}>
          <label className="btn-ghost" style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
            Choose CSV File
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
          {error && <p style={{ color: '#e31837', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
        </div>

        <textarea 
          value={text} 
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }} 
          rows={12} 
        />
        
        <div className="row-gap">
          <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(uploadTemplateHeaders())}>Copy Template Headers</button>
          <button 
            type="button" 
            disabled={loading || result.errors.length > 0 || result.records.length === 0} 
            onClick={() => setShowConfirm(true)}
          >
            {loading ? 'Processing...' : 'Apply Upload'}
          </button>
          <Badge label={`Preview records: ${result.records.length}`} tone="info" />
          {(result.errors.length > 0 || error) && (
            <button type="button" className="btn-ghost" onClick={() => { setText(uploadTemplateHeaders()); setError(null); }}>Clear Errors</button>
          )}
        </div>

        {result.errors.length > 0 && (
          <ul style={{ color: '#e31837', fontSize: '0.8rem', marginTop: '1rem' }}>
            {result.errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        )}

        {!error && result.errors.length === 0 && result.records.length > 0 && (
          <p className="small" style={{ color: '#22c55e', marginTop: '1rem' }}>Validation passed. {result.records.length} records ready.</p>
        )}
      </Section>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <Section title="Confirm Upload">
              <p>You are about to upsert <strong>{result.records.length}</strong> features. Existing features with the same IDs will be updated.</p>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button type="button" onClick={handleApply} disabled={loading}>
                  {loading ? 'Uploading...' : 'Confirm & Proceed'}
                </button>
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
