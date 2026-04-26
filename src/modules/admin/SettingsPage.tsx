import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader, Section } from '../../shared/ui/components'
import { useSettings } from '../../hooks/useSettings'
import { PhaseManager } from './PhaseManager'

export function SettingsPage() {
  const { githubSettings, loading, error, updateGithubSettings } = useSettings()
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isEnabled, setIsEnabled] = useState(githubSettings?.enabled ?? false)

  // Keep isEnabled in sync if githubSettings loads asynchronously
  useEffect(() => {
    setIsEnabled(githubSettings?.enabled ?? false)
  }, [githubSettings?.enabled])

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#ff4444' }}>Error loading settings: {error.message}</p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaveLoading(true)
    setSaveSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const isEnabled = formData.get('github_enabled') === 'on'
    const format = formData.get('github_format') as string
    
    try {
      await updateGithubSettings({
        enabled: isEnabled,
        logFormat: format
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <PageHeader 
        title="System Settings" 
        subtitle="Manage global integrations and automation rules." 
      />

      <Section title="GitHub Webhook Automation" style={{ marginTop: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
          Configure the automatic activity logging from your GitHub repository. When developers push commits containing 
          SRS tags (e.g., <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px' }}>[SRS-AUTH-12]</code>), 
          the dashboard will automatically log the progress under the corresponding feature.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                name="github_enabled"
                id="github-toggle"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
              <div
                className="toggle-track"
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: isEnabled ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                  borderRadius: '24px',
                  transition: '0.3s',
                }}
              />
              <div
                className="toggle-thumb"
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isEnabled ? '26px' : '2px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.3s',
                }}
              />
            </div>
            <span style={{ fontWeight: '500' }}>Enable Webhook Processing</span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="github_format" style={{ fontWeight: '500', fontSize: '0.875rem' }}>
              Activity Feed Log Format
            </label>
            <input 
              type="text" 
              id="github_format"
              name="github_format"
              defaultValue={githubSettings?.logFormat}
              placeholder="e.g. Code updated via GitHub commit {sha}: {message}"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-base)',
                fontSize: '0.875rem'
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Supported variables: {'{sha}'}, {'{message}'}, {'{url}'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              disabled={saveLoading || loading}
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: (saveLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (saveLoading || loading) ? 0.7 : 1,
              }}
            >
              {loading ? 'Loading...' : saveLoading ? 'Saving...' : 'Save Settings'}
            </button>
            
            {saveSuccess && (
              <span style={{ color: '#4caf50', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Settings saved successfully
              </span>
            )}
          </div>
        </form>
      </Section>

      <PhaseManager />
    </div>
  )
}
