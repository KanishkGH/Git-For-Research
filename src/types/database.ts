/**
 * Database type definitions matching the deployed Supabase schema.
 * Generated for Git for Research.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkspaceRole = 'owner' | 'editor' | 'viewer'
export type ArtifactType = 'markdown' | 'pdf' | 'chatgpt_export' | 'claude_export' | 'codebase'
export type MergeStatus = 'pending' | 'success' | 'conflict' | 'resolved'
export type PresenceStatus = 'viewing' | 'editing'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceRole
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role: WorkspaceRole
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRole
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      artifacts: {
        Row: {
          id: string
          workspace_id: string
          name: string
          artifact_type: ArtifactType
          original_filename: string | null
          storage_path: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          artifact_type: ArtifactType
          original_filename?: string | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          artifact_type?: ArtifactType
          original_filename?: string | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'artifacts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'artifacts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      commits: {
        Row: {
          id: string
          workspace_id: string
          artifact_id: string
          parent_commit_id: string | null
          merge_parent_id: string | null
          content: string
          content_hash: string
          message: string
          author_id: string | null
          is_merge_commit: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          artifact_id: string
          parent_commit_id?: string | null
          merge_parent_id?: string | null
          content: string
          content_hash: string
          message: string
          author_id?: string | null
          is_merge_commit?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          artifact_id?: string
          parent_commit_id?: string | null
          merge_parent_id?: string | null
          content?: string
          content_hash?: string
          message?: string
          author_id?: string | null
          is_merge_commit?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'commits_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commits_artifact_id_fkey'
            columns: ['artifact_id']
            isOneToOne: false
            referencedRelation: 'artifacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commits_parent_commit_id_fkey'
            columns: ['parent_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commits_merge_parent_id_fkey'
            columns: ['merge_parent_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commits_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      branches: {
        Row: {
          id: string
          workspace_id: string
          artifact_id: string
          name: string
          head_commit_id: string | null
          created_from_commit_id: string | null
          created_by: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          artifact_id: string
          name: string
          head_commit_id?: string | null
          created_from_commit_id?: string | null
          created_by?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          artifact_id?: string
          name?: string
          head_commit_id?: string | null
          created_from_commit_id?: string | null
          created_by?: string | null
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'branches_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'branches_artifact_id_fkey'
            columns: ['artifact_id']
            isOneToOne: false
            referencedRelation: 'artifacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'branches_head_commit_id_fkey'
            columns: ['head_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'branches_created_from_commit_id_fkey'
            columns: ['created_from_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'branches_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      merge_records: {
        Row: {
          id: string
          workspace_id: string
          artifact_id: string
          source_branch_id: string
          target_branch_id: string
          base_commit_id: string
          source_commit_id: string
          target_commit_id: string
          result_commit_id: string | null
          status: MergeStatus
          conflict_content: string | null
          resolved_content: string | null
          initiated_by: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          artifact_id: string
          source_branch_id: string
          target_branch_id: string
          base_commit_id: string
          source_commit_id: string
          target_commit_id: string
          result_commit_id?: string | null
          status?: MergeStatus
          conflict_content?: string | null
          resolved_content?: string | null
          initiated_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          artifact_id?: string
          source_branch_id?: string
          target_branch_id?: string
          base_commit_id?: string
          source_commit_id?: string
          target_commit_id?: string
          result_commit_id?: string | null
          status?: MergeStatus
          conflict_content?: string | null
          resolved_content?: string | null
          initiated_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'merge_records_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_artifact_id_fkey'
            columns: ['artifact_id']
            isOneToOne: false
            referencedRelation: 'artifacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_source_branch_id_fkey'
            columns: ['source_branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_target_branch_id_fkey'
            columns: ['target_branch_id']
            isOneToOne: false
            referencedRelation: 'branches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_base_commit_id_fkey'
            columns: ['base_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_source_commit_id_fkey'
            columns: ['source_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_target_commit_id_fkey'
            columns: ['target_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_result_commit_id_fkey'
            columns: ['result_commit_id']
            isOneToOne: false
            referencedRelation: 'commits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'merge_records_initiated_by_fkey'
            columns: ['initiated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      presence_sessions: {
        Row: {
          id: string
          workspace_id: string
          artifact_id: string
          user_id: string
          status: PresenceStatus
          last_seen_at: string
          session_token: string
        }
        Insert: {
          id?: string
          workspace_id: string
          artifact_id: string
          user_id: string
          status?: PresenceStatus
          last_seen_at?: string
          session_token?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          artifact_id?: string
          user_id?: string
          status?: PresenceStatus
          last_seen_at?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'presence_sessions_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'presence_sessions_artifact_id_fkey'
            columns: ['artifact_id']
            isOneToOne: false
            referencedRelation: 'artifacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'presence_sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      workspace_role: WorkspaceRole
      artifact_type: ArtifactType
      merge_status: MergeStatus
      presence_status: PresenceStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience Type Aliases
export type UserRow = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type WorkspaceRow = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export type WorkspaceMemberRow = Database['public']['Tables']['workspace_members']['Row']
export type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert']
export type WorkspaceMemberUpdate = Database['public']['Tables']['workspace_members']['Update']

export type ArtifactRow = Database['public']['Tables']['artifacts']['Row']
export type ArtifactInsert = Database['public']['Tables']['artifacts']['Insert']
export type ArtifactUpdate = Database['public']['Tables']['artifacts']['Update']

export type CommitRow = Database['public']['Tables']['commits']['Row']
export type CommitInsert = Database['public']['Tables']['commits']['Insert']
export type CommitUpdate = Database['public']['Tables']['commits']['Update']

export type BranchRow = Database['public']['Tables']['branches']['Row']
export type BranchInsert = Database['public']['Tables']['branches']['Insert']
export type BranchUpdate = Database['public']['Tables']['branches']['Update']

export type MergeRecordRow = Database['public']['Tables']['merge_records']['Row']
export type MergeRecordInsert = Database['public']['Tables']['merge_records']['Insert']
export type MergeRecordUpdate = Database['public']['Tables']['merge_records']['Update']

export type PresenceSessionRow = Database['public']['Tables']['presence_sessions']['Row']
export type PresenceSessionInsert = Database['public']['Tables']['presence_sessions']['Insert']
export type PresenceSessionUpdate = Database['public']['Tables']['presence_sessions']['Update']
