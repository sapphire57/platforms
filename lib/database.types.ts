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
      tenants: {
        Row: {
          id: string
          name: string
          subdomain: string
          emoji: string
          owner_id: string
          created_at: string
          updated_at: string
          subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan: 'free' | 'pro' | 'enterprise'
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          emoji: string
          owner_id: string
          created_at?: string
          updated_at?: string
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan?: 'free' | 'pro' | 'enterprise'
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          emoji?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'past_due'
          subscription_plan?: 'free' | 'pro' | 'enterprise'
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: 'owner' | 'manager' | 'auditor' | 'observer'
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: 'owner' | 'manager' | 'auditor' | 'observer'
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'auditor' | 'observer'
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_levels: {
        Row: {
          id: string
          name: string
          description: string | null
          level: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          level: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          level?: number
          created_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          permission_level_id: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          permission_level_id: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          permission_level_id?: string
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_level_id_fkey"
            columns: ["permission_level_id"]
            isOneToOne: false
            referencedRelation: "permission_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due'
      subscription_plan: 'free' | 'pro' | 'enterprise'
      user_role: 'owner' | 'manager' | 'auditor' | 'observer'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}