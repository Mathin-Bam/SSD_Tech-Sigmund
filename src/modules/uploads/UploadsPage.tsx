import React, { useState } from 'react';
import { useFeatures } from '../../hooks/useFeatures';
import type { Feature } from '../../domain/types';

export function UploadsPage({ onMergeFeatures }: { onMergeFeatures?: (features: Feature[]) => Promise<void> }) {
  const { bulkUpsertFeatures, loading } = useFeatures();
  const [jsonInput, setJsonInput] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleIngest = async () => {
    try {
      setStatusMsg('Parsing JSON...');
      const rawData = JSON.parse(jsonInput);
      
      const featuresToUpload: Feature[] = rawData.map((item: any) => ({
        featureId: crypto.randomUUID(), 
        featureName: item.featureName,
        phaseId: item.phaseId || 'V1.0',
        phaseName: item.phaseName || 'Version 1.0',
        moduleName: item.moduleName,
        description: item.description || '',
        priority: item.priority || 'Medium',
        assignedTo: item.assignedTo || 'Unassigned',
        owner: item.owner || 'Unassigned',
        team: item.team || 'Unassigned',
        stage: 'Design', 
        status: 'Not Started', 
        progress: 0, 
        startDate: new Date().toISOString(),
        plannedDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        onTrackStatus: 'On Track',
        currentTask: 'Initial setup',
        nextTask: 'Design review',
        dependencies: [],
        blockerNote: '',
        qaStatus: 'Pending',
        designStatus: 'Pending',
        developmentStatus: 'Pending',
        lastUpdatedBy: 'System',
        lastUpdatedAt: new Date().toISOString(),
        clientVisibility: true,
        executiveSummary: item.executiveSummary || '',
        internalNotes: item.internalNotes || ''
      }));

      setStatusMsg(`Uploading ${featuresToUpload.length} features to Supabase...`);
      await bulkUpsertFeatures(featuresToUpload);
      setStatusMsg('Success! Dashboard populated. You can now go to the Features page.');
      setJsonInput(''); 
    } catch (error) {
      console.error(error);
      setStatusMsg('Error: Invalid JSON or Upload Failed. Check console.');
    }
  };

  return (
    <div className="section" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', marginTop: '2rem' }}>
      <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>Project Bootstrap (JSON Ingestion)</h2>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder="Paste JSON array here..."
        style={{
          width: '100%', height: '300px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text)', padding: '1rem', fontFamily: 'monospace', marginBottom: '1rem'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={handleIngest} disabled={loading || !jsonInput}
          style={{ background: 'var(--brand-primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}
        >
          {loading ? 'Ingesting...' : 'Ingest Features'}
        </button>
        {statusMsg && <span style={{ color: 'var(--text)' }}>{statusMsg}</span>}
      </div>
    </div>
  );
}
