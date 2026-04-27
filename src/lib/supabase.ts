import { createClient } from '@supabase/supabase-js'
import type { FeatureStatus, FeatureStage, OnTrackStatus } from '../domain/types'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'executive' | 'dev'
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'executive' | 'dev'
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'executive'
          full_name?: string | null
          created_at?: string
        }
      }
      features: {
        Row: {
          feature_id: string
          feature_name: string
          description: string
          phase_id: string
          phase_name: string
          module_name: string
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to: string
          owner: string
          team: string
          stage: FeatureStage
          status: FeatureStatus
          progress: number
          start_date: string
          planned_deadline: string
          revised_deadline: string | null
          estimated_completion_date: string
          on_track_status: OnTrackStatus
          current_task: string
          next_task: string
          dependencies: string[]
          blocker_note: string
          qa_status: string
          design_status: string
          development_status: string
          last_updated_by: string
          last_updated_at: string
          client_visibility: boolean
          executive_summary: string | null
          mvp_url: string | null
          srs_requirement_id: string | null
          github_pr_url: string | null
          internal_notes: string | null
          created_at: string
        }
        Insert: {
          feature_id: string
          feature_name: string
          description: string
          phase_id: string
          phase_name: string
          module_name: string
          priority: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to: string
          owner: string
          team: string
          stage: FeatureStage
          status: FeatureStatus
          progress: number
          start_date: string
          planned_deadline: string
          revised_deadline?: string | null
          estimated_completion_date: string
          on_track_status: OnTrackStatus
          current_task: string
          next_task: string
          dependencies: string[]
          blocker_note: string
          qa_status: string
          design_status: string
          development_status: string
          last_updated_by: string
          last_updated_at: string
          client_visibility: boolean
          executive_summary?: string | null
          mvp_url?: string | null
          srs_requirement_id?: string | null
          github_pr_url?: string | null
          internal_notes?: string | null
          created_at?: string
        }
        Update: {
          feature_id?: string
          feature_name?: string
          description?: string
          phase_id?: string
          phase_name?: string
          module_name?: string
          priority?: 'Low' | 'Medium' | 'High' | 'Critical'
          assigned_to?: string
          owner?: string
          team?: string
          stage?: FeatureStage
          status?: FeatureStatus
          progress?: number
          start_date?: string
          planned_deadline?: string
          revised_deadline?: string | null
          estimated_completion_date?: string
          on_track_status?: OnTrackStatus
          current_task?: string
          next_task?: string
          dependencies?: string[]
          blocker_note?: string
          qa_status?: string
          design_status?: string
          development_status?: string
          last_updated_by?: string
          last_updated_at?: string
          client_visibility?: boolean
          executive_summary?: string | null
          mvp_url?: string | null
          srs_requirement_id?: string | null
          github_pr_url?: string | null
          internal_notes?: string | null
          created_at?: string
        }
      }
      flag_logs: {
        Row: {
          id: string
          feature_id: string
          flag_reason: string
          resolution_note: string
          resolved_by: string | null
          resolved_at: string
        }
        Insert: {
          id?: string
          feature_id: string
          flag_reason: string
          resolution_note: string
          resolved_by?: string | null
          resolved_at?: string
        }
        Update: {
          id?: string
          feature_id?: string
          flag_reason?: string
          resolution_note?: string
          resolved_by?: string | null
          resolved_at?: string
        }
      }
      update_logs: {
        Row: {
          id: string
          feature_id: string
          changed_by: string
          change_type: 'manual' | 'github_push'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          feature_id: string
          changed_by: string
          change_type: 'manual' | 'github_push'
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          feature_id?: string
          changed_by?: string
          change_type?: 'manual' | 'github_push'
          note?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          user_id: string
          full_name: string
          email: string | null
          role: string
          department: string
          availability: 'Available' | 'Near Capacity' | 'Overloaded'
          active: boolean
        }
        Insert: {
          user_id: string
          full_name: string
          email?: string | null
          role: string
          department?: string
          availability?: 'Available' | 'Near Capacity' | 'Overloaded'
          active?: boolean
        }
        Update: {
          user_id?: string
          full_name?: string
          email?: string | null
          role?: string
          department?: string
          availability?: 'Available' | 'Near Capacity' | 'Overloaded'
          active?: boolean
        }
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          created_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
          created_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
          created_at?: string
        }
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local or Vercel Environment Variables.')
}

// Fallback to dummy strings to prevent module-level crash if env vars are missing
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
