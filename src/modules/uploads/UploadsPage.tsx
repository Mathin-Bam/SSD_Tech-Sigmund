import { useMemo, useState } from 'react'
import type { Feature } from '../../domain/types'
import { Badge, Section } from '../../shared/ui/components'
import { parseUploadCsv, uploadTemplateHeaders } from './parser'

export function UploadsPage({ onMergeFeatures }: { onMergeFeatures: (features: Feature[]) => void }) {
  const [text, setText] = useState(uploadTemplateHeaders())
  const result = useMemo(() => parseUploadCsv(text), [text])

  return (
    <div className="page">
      <Section title="Phase Upload Workflow">
        <p className="small">Upload order: create phase, add features, assign owners, set deadlines, update progress, mark risks, move stages, archive phase.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} />
        <div className="row-gap">
          <button type="button" onClick={() => navigator.clipboard.writeText(uploadTemplateHeaders())}>Copy Template Headers</button>
          <button type="button" disabled={result.errors.length > 0 || result.records.length === 0} onClick={() => onMergeFeatures(result.records)}>Apply Upload</button>
          <Badge label={`Preview records: ${result.records.length}`} tone="info" />
        </div>
        {result.errors.length > 0 ? (
          <ul>
            {result.errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        ) : (
          <p className="small">Validation passed. Upload is ready.</p>
        )}
      </Section>
    </div>
  )
}
