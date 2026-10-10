export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      archived_marks: {
        Row: {
          behaviour_score: number | null
          created_by: string | null
          date: string
          id: string
          present: boolean
          score: number | null
          section: Database["public"]["Enums"]["section"]
          session_id: string
          source_created_at: string | null
          source_mark_id: string
          source_member_id: string
          source_updated_at: string | null
          uniform_score: number | null
        }
        Insert: {
          behaviour_score?: number | null
          created_by?: string | null
          date: string
          id?: string
          present: boolean
          score?: number | null
          section: Database["public"]["Enums"]["section"]
          session_id: string
          source_created_at?: string | null
          source_mark_id: string
          source_member_id: string
          source_updated_at?: string | null
          uniform_score?: number | null
        }
        Update: {
          behaviour_score?: number | null
          created_by?: string | null
          date?: string
          id?: string
          present?: boolean
          score?: number | null
          section?: Database["public"]["Enums"]["section"]
          session_id?: string
          source_created_at?: string | null
          source_mark_id?: string
          source_member_id?: string
          source_updated_at?: string | null
          uniform_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_marks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bb_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_members: {
        Row: {
          id: string
          is_squad_leader: boolean
          name: string
          school_year: string
          section: Database["public"]["Enums"]["section"]
          session_id: string
          source_created_at: string | null
          source_member_id: string
          source_updated_at: string | null
          squad: number
        }
        Insert: {
          id?: string
          is_squad_leader?: boolean
          name: string
          school_year: string
          section: Database["public"]["Enums"]["section"]
          session_id: string
          source_created_at?: string | null
          source_member_id: string
          source_updated_at?: string | null
          squad: number
        }
        Update: {
          id?: string
          is_squad_leader?: boolean
          name?: string
          school_year?: string
          section?: Database["public"]["Enums"]["section"]
          session_id?: string
          source_created_at?: string | null
          source_member_id?: string
          source_updated_at?: string | null
          squad?: number
        }
        Relationships: [
          {
            foreignKeyName: "archived_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bb_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          revert_data: Json
          reverted_log_id: string | null
          section: Database["public"]["Enums"]["section"] | null
          timestamp: string
          updated_at: string
          user_email: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          revert_data?: Json
          reverted_log_id?: string | null
          section?: Database["public"]["Enums"]["section"] | null
          timestamp?: string
          updated_at?: string
          user_email: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          revert_data?: Json
          reverted_log_id?: string | null
          section?: Database["public"]["Enums"]["section"] | null
          timestamp?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_reverted_log_id_fkey"
            columns: ["reverted_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      bb_sessions: {
        Row: {
          closed_at: string
          closed_by: string | null
          closed_by_email: string | null
          created_at: string
          id: string
          label: string
          mark_count: number
          member_count: number
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          closed_by_email?: string | null
          created_at?: string
          id?: string
          label: string
          mark_count?: number
          member_count?: number
        }
        Update: {
          closed_at?: string
          closed_by?: string | null
          closed_by_email?: string | null
          created_at?: string
          id?: string
          label?: string
          mark_count?: number
          member_count?: number
        }
        Relationships: []
      }
      company_calendar_settings: {
        Row: {
          ends_at: string
          ends_on: string
          id: boolean
          location: string
          starts_at: string
          starts_on: string
          timezone: string
        }
        Insert: {
          ends_at: string
          ends_on: string
          id?: boolean
          location?: string
          starts_at: string
          starts_on: string
          timezone?: string
        }
        Update: {
          ends_at?: string
          ends_on?: string
          id?: boolean
          location?: string
          starts_at?: string
          starts_on?: string
          timezone?: string
        }
        Relationships: []
      }
      company_events: {
        Row: {
          cancelled: boolean
          created_at: string
          details: string
          ends_at: string
          id: string
          location: string
          meeting_date: string | null
          revision: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          details?: string
          ends_at: string
          id?: string
          location?: string
          meeting_date?: string | null
          revision?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          details?: string
          ends_at?: string
          id?: string
          location?: string
          meeting_date?: string | null
          revision?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          section: Database["public"]["Enums"]["section"] | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          section?: Database["public"]["Enums"]["section"] | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          section?: Database["public"]["Enums"]["section"] | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      marks: {
        Row: {
          behaviour_score: number | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          member_id: string
          present: boolean
          score: number | null
          section: Database["public"]["Enums"]["section"]
          uniform_score: number | null
          updated_at: string
        }
        Insert: {
          behaviour_score?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          member_id: string
          present?: boolean
          score?: number | null
          section: Database["public"]["Enums"]["section"]
          uniform_score?: number | null
          updated_at?: string
        }
        Update: {
          behaviour_score?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          member_id?: string
          present?: boolean
          score?: number | null
          section?: Database["public"]["Enums"]["section"]
          uniform_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          imported_from_archived_member_id: string | null
          is_squad_leader: boolean
          name: string
          school_year: string
          section: Database["public"]["Enums"]["section"]
          squad: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_from_archived_member_id?: string | null
          is_squad_leader?: boolean
          name: string
          school_year: string
          section: Database["public"]["Enums"]["section"]
          squad: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_from_archived_member_id?: string | null
          is_squad_leader?: boolean
          name?: string
          school_year?: string
          section?: Database["public"]["Enums"]["section"]
          squad?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_imported_from_archived_member_id_fkey"
            columns: ["imported_from_archived_member_id"]
            isOneToOne: false
            referencedRelation: "archived_members"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_accounts: {
        Row: {
          activated_at: string | null
          code_fingerprint: string | null
          code_hash: string | null
          created_at: string
          feed_hash: string | null
          member_id: string
          user_id: string | null
          username: string
        }
        Insert: {
          activated_at?: string | null
          code_fingerprint?: string | null
          code_hash?: string | null
          created_at?: string
          feed_hash?: string | null
          member_id: string
          user_id?: string | null
          username: string
        }
        Update: {
          activated_at?: string | null
          code_fingerprint?: string | null
          code_hash?: string | null
          created_at?: string
          feed_hash?: string | null
          member_id?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_attempts: {
        Row: {
          attempts: number
          key: string
          window_start: string
        }
        Insert: {
          attempts?: number
          key: string
          window_start?: string
        }
        Update: {
          attempts?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      portal_notifications: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "company_events"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_push_deliveries: {
        Row: {
          attempts: number
          delivered_at: string | null
          lease_until: string | null
          next_attempt_at: string
          notification_id: string
          subscription_id: string
        }
        Insert: {
          attempts?: number
          delivered_at?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          notification_id: string
          subscription_id: string
        }
        Update: {
          attempts?: number
          delivered_at?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          notification_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_push_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "portal_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "portal_push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          meeting_day: number
          section: Database["public"]["Enums"]["section"]
          squads: Json
          updated_at: string
        }
        Insert: {
          meeting_day: number
          section: Database["public"]["Enums"]["section"]
          squads?: Json
          updated_at?: string
        }
        Update: {
          meeting_day?: number
          section?: Database["public"]["Enums"]["section"]
          squads?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_audit_logs: {
        Args: { log_email: string; user_uid: string }
        Returns: boolean
      }
      can_access_section: {
        Args: { section_name: string; user_uid: string }
        Returns: boolean
      }
      claim_invite_code: {
        Args: { p_code: string }
        Returns: {
          applied_role: string
          assigned_section: Database["public"]["Enums"]["section"]
        }[]
      }
      claim_portal_push: {
        Args: never
        Returns: {
          body: string
          notification_id: string
          subscription: Json
          subscription_id: string
          title: string
        }[]
      }
      cleanup_old_invite_codes: { Args: never; Returns: number }
      company_portal_summary: { Args: never; Returns: Json }
      current_app_role: { Args: never; Returns: string }
      dispatch_portal_push_job: { Args: never; Returns: undefined }
      generate_company_nights: { Args: never; Returns: number }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: { Args: { user_uid: string }; Returns: string }
      is_portal_member: { Args: never; Returns: boolean }
      is_portal_staff: { Args: never; Returns: boolean }
      portal_check_code: {
        Args: { p_code: string; p_ip_key: string; p_username: string }
        Returns: string
      }
      portal_complete_setup: { Args: { p_user_id: string }; Returns: boolean }
      portal_issue_code: {
        Args: {
          p_code: string
          p_member_id: string
          p_user_id: string
          p_username: string
        }
        Returns: string
      }
      save_company_event: {
        Args: {
          p_cancelled: boolean
          p_details: string
          p_ends_local: string
          p_id: string
          p_location: string
          p_revision: number
          p_starts_local: string
          p_title: string
        }
        Returns: string
      }
      save_member_marks_patch: {
        Args: {
          p_delete_dates?: string[]
          p_member_id: string
          p_section: Database["public"]["Enums"]["section"]
          p_upsert_rows?: Json
        }
        Returns: undefined
      }
      save_weekly_marks_snapshot: {
        Args: {
          p_meeting_date: string
          p_section: Database["public"]["Enums"]["section"]
          p_snapshot?: Json
        }
        Returns: undefined
      }
      squads_payload_is_valid: { Args: { payload: Json }; Returns: boolean }
      start_new_bb_session: { Args: { p_label: string }; Returns: Json }
      validate_invite_code: {
        Args: { p_code: string }
        Returns: {
          default_role: string
          section: Database["public"]["Enums"]["section"]
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "captain" | "officer"
      section: "company" | "junior"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "captain", "officer"],
      section: ["company", "junior"],
    },
  },
} as const
