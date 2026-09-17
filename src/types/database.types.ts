export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      consents: {
        Row: {
          created_at: string
          document_version: string
          given_at: string
          given_by: string | null
          id: string
          recorded_by: string | null
          revoked_at: string | null
          student_id: string
          type: Database["public"]["Enums"]["consent_type"]
        }
        Insert: {
          created_at?: string
          document_version: string
          given_at?: string
          given_by?: string | null
          id?: string
          recorded_by?: string | null
          revoked_at?: string | null
          student_id: string
          type: Database["public"]["Enums"]["consent_type"]
        }
        Update: {
          created_at?: string
          document_version?: string
          given_at?: string
          given_by?: string | null
          id?: string
          recorded_by?: string | null
          revoked_at?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["consent_type"]
        }
        Relationships: [
          {
            foreignKeyName: "consents_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      invitations: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          student_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          last_seen_at: string | null
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          last_seen_at?: string | null
          organization_id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_modules: {
        Row: {
          enabled: boolean
          module_id: string
          settings: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          enabled: boolean
          module_id: string
          settings?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          module_id?: string
          settings?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      student_parents: {
        Row: {
          can_view_details: boolean
          created_at: string
          parent_id: string
          relation: Database["public"]["Enums"]["parent_relation"]
          student_id: string
        }
        Insert: {
          can_view_details?: boolean
          created_at?: string
          parent_id: string
          relation: Database["public"]["Enums"]["parent_relation"]
          student_id: string
        }
        Update: {
          can_view_details?: boolean
          created_at?: string
          parent_id?: string
          relation?: Database["public"]["Enums"]["parent_relation"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      students: {
        Row: {
          class_section: string | null
          coach_id: string
          created_at: string
          curriculum_template_id: string | null
          exam_date: string | null
          grade: number
          organization_id: string
          profile_id: string
          school_name: string | null
          season: string
          status: Database["public"]["Enums"]["student_status"]
          target_percentile: number | null
          updated_at: string
        }
        Insert: {
          class_section?: string | null
          coach_id: string
          created_at?: string
          curriculum_template_id?: string | null
          exam_date?: string | null
          grade?: number
          organization_id: string
          profile_id: string
          school_name?: string | null
          season: string
          status?: Database["public"]["Enums"]["student_status"]
          target_percentile?: number | null
          updated_at?: string
        }
        Update: {
          class_section?: string | null
          coach_id?: string
          created_at?: string
          curriculum_template_id?: string | null
          exam_date?: string | null
          grade?: number
          organization_id?: string
          profile_id?: string
          school_name?: string | null
          season?: string
          status?: Database["public"]["Enums"]["student_status"]
          target_percentile?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: {
          p_code: string
          p_full_name: string
          p_relation: Database["public"]["Enums"]["parent_relation"]
        }
        Returns: string
      }
      assign_coach: {
        Args: { p_coach_id: string; p_student_id: string }
        Returns: undefined
      }
      can_delete_student: { Args: { p_student_id: string }; Returns: boolean }
      can_manage_student: { Args: { p_student_id: string }; Returns: boolean }
      create_student_account: {
        Args: {
          p_actor_id: string
          p_auth_user_id: string
          p_coach_id: string
          p_exam_date: string
          p_full_name: string
          p_season: string
          p_username: string
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      consent_type: "privacy_notice" | "explicit_consent" | "photo_upload"
      parent_relation: "mother" | "father" | "guardian" | "other"
      student_status: "active" | "paused" | "archived"
      user_role: "owner" | "coach" | "student" | "parent"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consent_type: ["privacy_notice", "explicit_consent", "photo_upload"],
      parent_relation: ["mother", "father", "guardian", "other"],
      student_status: ["active", "paused", "archived"],
      user_role: ["owner", "coach", "student", "parent"],
    },
  },
} as const

