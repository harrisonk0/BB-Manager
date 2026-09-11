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
          is_squad_leader?: boolean
          name?: string
          school_year?: string
          section?: Database["public"]["Enums"]["section"]
          squad?: number
          updated_at?: string
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
          updated_at: string
        }
        Insert: {
          meeting_day: number
          section: Database["public"]["Enums"]["section"]
          updated_at?: string
        }
        Update: {
          meeting_day?: number
          section?: Database["public"]["Enums"]["section"]
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
      cleanup_old_invite_codes: { Args: never; Returns: number }
      current_app_role: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: { Args: { user_uid: string }; Returns: string }
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
