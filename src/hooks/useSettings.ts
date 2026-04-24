import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface GithubIntegrationSettings {
  enabled: boolean
  logFormat: string
}

export function useSettings() {
  const [githubSettings, setGithubSettings] = useState<GithubIntegrationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'github_integration')
          .single()

        if (error && error.code !== 'PGRST116') throw error
        
        if (mounted) {
          if (data) {
            setGithubSettings(data.value as GithubIntegrationSettings)
          } else {
            // Default if not found
            setGithubSettings({
              enabled: true,
              logFormat: 'Code updated via GitHub commit {sha}: {message}'
            })
          }
        }
      } catch (err: any) {
        if (mounted) setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [])

  const updateGithubSettings = async (newSettings: GithubIntegrationSettings) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'github_integration',
          value: newSettings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setGithubSettings(newSettings)
    } catch (err: any) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { githubSettings, loading, error, updateGithubSettings }
}
