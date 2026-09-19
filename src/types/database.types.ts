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
      busy_slots: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["busy_slot_kind"]
          note: string | null
          starts_at: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["busy_slot_kind"]
          note?: string | null
          starts_at: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["busy_slot_kind"]
          note?: string | null
          starts_at?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "busy_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "busy_slots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
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
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      curriculum_templates: {
        Row: {
          based_on_id: string | null
          created_at: string
          exam_date: string | null
          exam_type: string
          grade: number
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          scoring: Json
          season: string
          updated_at: string
        }
        Insert: {
          based_on_id?: string | null
          created_at?: string
          exam_date?: string | null
          exam_type: string
          grade: number
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          scoring: Json
          season: string
          updated_at?: string
        }
        Update: {
          based_on_id?: string | null
          created_at?: string
          exam_date?: string | null
          exam_type?: string
          grade?: number
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          scoring?: Json
          season?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_templates_based_on_id_fkey"
            columns: ["based_on_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string
          ends_on: string | null
          id: string
          is_active: boolean
          metric: Database["public"]["Enums"]["goal_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          starts_on: string
          student_id: string
          subject_id: string | null
          target_value: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          metric?: Database["public"]["Enums"]["goal_metric"]
          period: Database["public"]["Enums"]["goal_period"]
          starts_on?: string
          student_id: string
          subject_id?: string | null
          target_value: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          metric?: Database["public"]["Enums"]["goal_metric"]
          period?: Database["public"]["Enums"]["goal_period"]
          starts_on?: string
          student_id?: string
          subject_id?: string | null
          target_value?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
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
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
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
      mistakes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_path: string | null
          mock_result_id: string | null
          note: string | null
          reason: Database["public"]["Enums"]["mistake_reason"]
          solved_at: string | null
          status: Database["public"]["Enums"]["mistake_status"]
          student_id: string
          subject_id: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          mock_result_id?: string | null
          note?: string | null
          reason?: Database["public"]["Enums"]["mistake_reason"]
          solved_at?: string | null
          status?: Database["public"]["Enums"]["mistake_status"]
          student_id: string
          subject_id: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          mock_result_id?: string | null
          note?: string | null
          reason?: Database["public"]["Enums"]["mistake_reason"]
          solved_at?: string | null
          status?: Database["public"]["Enums"]["mistake_status"]
          student_id?: string
          subject_id?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_mock_result_id_fkey"
            columns: ["mock_result_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mistakes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      mock_exam_results: {
        Row: {
          created_at: string
          created_by: string | null
          custom_title: string | null
          duration_minutes: number | null
          id: string
          mock_exam_id: string | null
          note: string | null
          percentile: number | null
          score: number | null
          student_id: string
          subject_id: string | null
          taken_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          duration_minutes?: number | null
          id?: string
          mock_exam_id?: string | null
          note?: string | null
          percentile?: number | null
          score?: number | null
          student_id: string
          subject_id?: string | null
          taken_on: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          duration_minutes?: number | null
          id?: string
          mock_exam_id?: string | null
          note?: string | null
          percentile?: number | null
          score?: number | null
          student_id?: string
          subject_id?: string | null
          taken_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_results_mock_exam_id_fkey"
            columns: ["mock_exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "mock_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      mock_exam_subject_results: {
        Row: {
          blank_count: number
          correct_count: number
          net: number | null
          result_id: string
          subject_id: string
          wrong_count: number
          wrong_penalty: number
        }
        Insert: {
          blank_count?: number
          correct_count?: number
          net?: number | null
          result_id: string
          subject_id: string
          wrong_count?: number
          wrong_penalty: number
        }
        Update: {
          blank_count?: number
          correct_count?: number
          net?: number | null
          result_id?: string
          subject_id?: string
          wrong_count?: number
          wrong_penalty?: number
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_subject_results_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_subject_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_subject_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_subject_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_subject_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exam_subject_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      mock_exam_topic_mistakes: {
        Row: {
          result_id: string
          topic_id: string
        }
        Insert: {
          result_id: string
          topic_id: string
        }
        Update: {
          result_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_topic_mistakes_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_topic_mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_topic_mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "mock_exam_topic_mistakes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          created_at: string
          created_by: string | null
          exam_date: string | null
          id: string
          organization_id: string
          publisher: string | null
          subject_id: string | null
          template_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          id?: string
          organization_id: string
          publisher?: string | null
          subject_id?: string | null
          template_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          id?: string
          organization_id?: string
          publisher?: string | null
          subject_id?: string | null
          template_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "mock_exams_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
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
      plan_items: {
        Row: {
          completed_at: string | null
          created_at: string
          day_of_week: number | null
          estimated_minutes: number
          id: string
          kind: Database["public"]["Enums"]["plan_item_kind"]
          plan_id: string
          postponed_at: string | null
          postponed_from: number | null
          section_id: string | null
          sort_order: number
          student_note: string | null
          subject_id: string | null
          target_unit: string | null
          target_value: number | null
          title: string
          topic_id: string | null
          updated_at: string
          url: string | null
          video_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number | null
          estimated_minutes: number
          id?: string
          kind: Database["public"]["Enums"]["plan_item_kind"]
          plan_id: string
          postponed_at?: string | null
          postponed_from?: number | null
          section_id?: string | null
          sort_order?: number
          student_note?: string | null
          subject_id?: string | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          topic_id?: string | null
          updated_at?: string
          url?: string | null
          video_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number | null
          estimated_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["plan_item_kind"]
          plan_id?: string
          postponed_at?: string | null
          postponed_from?: number | null
          section_id?: string | null
          sort_order?: number
          student_note?: string | null
          subject_id?: string | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          url?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_completion"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "resource_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "plan_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "plan_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
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
      question_logs: {
        Row: {
          blank_count: number | null
          correct_count: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          log_date: string
          note: string | null
          plan_item_id: string | null
          section_id: string | null
          source: Database["public"]["Enums"]["question_source"]
          student_id: string
          subject_id: string
          topic_id: string | null
          total_count: number
          updated_at: string
          wrong_count: number | null
        }
        Insert: {
          blank_count?: number | null
          correct_count?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_date?: string
          note?: string | null
          plan_item_id?: string | null
          section_id?: string | null
          source?: Database["public"]["Enums"]["question_source"]
          student_id: string
          subject_id: string
          topic_id?: string | null
          total_count: number
          updated_at?: string
          wrong_count?: number | null
        }
        Update: {
          blank_count?: number | null
          correct_count?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          log_date?: string
          note?: string | null
          plan_item_id?: string | null
          section_id?: string | null
          source?: Database["public"]["Enums"]["question_source"]
          student_id?: string
          subject_id?: string
          topic_id?: string | null
          total_count?: number
          updated_at?: string
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_logs_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["open_plan_item_id"]
          },
          {
            foreignKeyName: "question_logs_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["open_plan_item_id"]
          },
          {
            foreignKeyName: "question_logs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "resource_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      resource_sections: {
        Row: {
          created_at: string
          id: string
          page_end: number | null
          page_start: number | null
          question_count: number | null
          resource_id: string
          sort_order: number
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          question_count?: number | null
          resource_id: string
          sort_order?: number
          subject_id?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          question_count?: number | null
          resource_id?: string
          sort_order?: number
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_sections_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_sections_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "resource_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resource_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resource_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resource_sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          publish_year: number | null
          publisher: string | null
          student_id: string | null
          subject_id: string | null
          template_id: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          publish_year?: number | null
          publisher?: string | null
          student_id?: string | null
          subject_id?: string | null
          template_id: string
          title: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          publish_year?: number | null
          publisher?: string | null
          student_id?: string | null
          subject_id?: string | null
          template_id?: string
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "resources_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          note: string | null
          on_date: string
          starts_at: string | null
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          note?: string | null
          on_date: string
          starts_at?: string | null
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          note?: string | null
          on_date?: string
          starts_at?: string | null
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_exceptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
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
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
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
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_playlists: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          playlist_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          playlist_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          playlist_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_playlists_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["playlist_id"]
          },
          {
            foreignKeyName: "student_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "video_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_resources: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          resource_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          resource_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          resource_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_resources_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_subject_targets: {
        Row: {
          created_at: string
          questions: number
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          questions: number
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          questions?: number
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "student_subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "student_subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "student_subject_targets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      student_topic_progress: {
        Row: {
          completed_at: string | null
          confidence: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          review_stage: number
          status: Database["public"]["Enums"]["topic_status"]
          student_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          confidence?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_stage?: number
          status?: Database["public"]["Enums"]["topic_status"]
          student_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          confidence?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          review_stage?: number
          status?: Database["public"]["Enums"]["topic_status"]
          student_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "student_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      student_topic_targets: {
        Row: {
          created_at: string
          created_by: string | null
          student_id: string
          target_on: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          student_id: string
          target_on: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          student_id?: string
          target_on?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_topic_targets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_targets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "student_topic_targets_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      student_video_progress: {
        Row: {
          created_at: string
          note: string | null
          student_id: string
          updated_at: string
          video_id: string
          watched_at: string | null
        }
        Insert: {
          created_at?: string
          note?: string | null
          student_id: string
          updated_at?: string
          video_id: string
          watched_at?: string | null
        }
        Update: {
          created_at?: string
          note?: string | null
          student_id?: string
          updated_at?: string
          video_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "student_video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
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
          target_starts_on: string | null
          topics_finish_by: string | null
          updated_at: string
          wake_end: string | null
          wake_start: string | null
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
          target_starts_on?: string | null
          topics_finish_by?: string | null
          updated_at?: string
          wake_end?: string | null
          wake_start?: string | null
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
          target_starts_on?: string | null
          topics_finish_by?: string | null
          updated_at?: string
          wake_end?: string | null
          wake_start?: string | null
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
            foreignKeyName: "students_curriculum_template_id_fkey"
            columns: ["curriculum_template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
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
      subjects: {
        Row: {
          code: string
          color: string
          exam_question_count: number | null
          exam_section: string | null
          icon: string
          id: string
          name: string
          short_name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          code: string
          color: string
          exam_question_count?: number | null
          exam_section?: string | null
          icon: string
          id?: string
          name: string
          short_name: string
          sort_order: number
          template_id: string
        }
        Update: {
          code?: string
          color?: string
          exam_question_count?: number | null
          exam_section?: string | null
          icon?: string
          id?: string
          name?: string
          short_name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_dismissals: {
        Row: {
          created_at: string
          dismissed_by: string
          dismissed_until: string
          id: string
          kind: Database["public"]["Enums"]["topic_alert_kind"]
          student_id: string
          subject_id: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          dismissed_by: string
          dismissed_until: string
          id?: string
          kind: Database["public"]["Enums"]["topic_alert_kind"]
          student_id: string
          subject_id: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          dismissed_by?: string
          dismissed_until?: string
          id?: string
          kind?: Database["public"]["Enums"]["topic_alert_kind"]
          student_id?: string
          subject_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_dismissals_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          estimated_minutes: number | null
          external_code: string | null
          id: string
          importance: number
          name: string
          parent_id: string | null
          school_finish_on: string | null
          semester: number | null
          sort_order: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_minutes?: number | null
          external_code?: string | null
          id?: string
          importance?: number
          name: string
          parent_id?: string | null
          school_finish_on?: string | null
          semester?: number | null
          sort_order: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_minutes?: number | null
          external_code?: string | null
          id?: string
          importance?: number
          name?: string
          parent_id?: string | null
          school_finish_on?: string | null
          semester?: number | null
          sort_order?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      video_playlists: {
        Row: {
          channel_name: string | null
          created_at: string
          created_by: string | null
          id: string
          imported_at: string | null
          organization_id: string
          student_id: string | null
          subject_id: string | null
          template_id: string
          title: string
          updated_at: string
          youtube_playlist_id: string | null
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imported_at?: string | null
          organization_id: string
          student_id?: string | null
          subject_id?: string | null
          template_id: string
          title: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          imported_at?: string | null
          organization_id?: string
          student_id?: string | null
          subject_id?: string | null
          template_id?: string
          title?: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_playlists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_playlists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "curriculum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          playlist_id: string
          sort_order: number
          title: string
          topic_id: string | null
          updated_at: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          playlist_id: string
          sort_order?: number
          title: string
          topic_id?: string | null
          updated_at?: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          playlist_id?: string
          sort_order?: number
          title?: string
          topic_id?: string | null
          updated_at?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["playlist_id"]
          },
          {
            foreignKeyName: "videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "video_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          coach_message: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["plan_status"]
          student_id: string
          student_reflection: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          coach_message?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id: string
          student_reflection?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          coach_message?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          student_id?: string
          student_reflection?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Views: {
      v_coach_student_overview: {
        Row: {
          coach_id: string | null
          full_name: string | null
          has_targets: boolean | null
          last_log_date: string | null
          last_mock_on: string | null
          last_net: number | null
          net_delta: number | null
          organization_id: string | null
          plan_done_week: number | null
          plan_items_week: number | null
          plan_percent_last_week: number | null
          plan_percent_week: number | null
          plan_to_date_percent_week: number | null
          prev_net: number | null
          season: string | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string | null
          topics_ahead: number | null
          topics_behind: number | null
          topics_done: number | null
          topics_expected: number | null
          topics_total: number | null
          username: string | null
          week_goal_percent: number | null
          week_questions: number | null
          weekly_target: number | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_plan_completion: {
        Row: {
          items_completed: number | null
          items_total: number | null
          percent: number | null
          plan_id: string | null
          postponed_count: number | null
          status: Database["public"]["Enums"]["plan_status"] | null
          student_id: string | null
          to_date_completed: number | null
          to_date_percent: number | null
          to_date_total: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_daily_summary: {
        Row: {
          blank: number | null
          correct: number | null
          day: string | null
          questions: number | null
          student_id: string | null
          study_minutes: number | null
          wrong: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_mock_subject_stats: {
        Row: {
          avg_net: number | null
          coach_id: string | null
          exam_question_count: number | null
          exams_count: number | null
          last_net: number | null
          organization_id: string | null
          student_id: string | null
          subject_id: string | null
          wrong_total: number | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_student_pace_facts: {
        Row: {
          coach_id: string | null
          completed_at: string | null
          organization_id: string | null
          school_finish_on: string | null
          status: Database["public"]["Enums"]["topic_status"] | null
          student_id: string | null
          subject_color: string | null
          subject_id: string | null
          subject_name: string | null
          subject_short_name: string | null
          subject_sort_order: number | null
          target_on: string | null
          topic_id: string | null
          topic_name: string | null
          topic_sort_order: number | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_student_playlist_progress: {
        Row: {
          last_watched_at: string | null
          minutes_remaining: number | null
          minutes_total: number | null
          percent: number | null
          playlist_id: string | null
          student_id: string | null
          videos_total: number | null
          videos_watched: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "v_student_playlist_videos"
            referencedColumns: ["playlist_id"]
          },
          {
            foreignKeyName: "student_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "video_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_playlist_videos: {
        Row: {
          duration_seconds: number | null
          note: string | null
          open_plan_item_id: string | null
          playlist_id: string | null
          playlist_title: string | null
          sort_order: number | null
          student_id: string | null
          subject_color: string | null
          subject_id: string | null
          subject_name: string | null
          subject_short_name: string | null
          title: string | null
          topic_id: string | null
          topic_name: string | null
          video_id: string | null
          watched_at: string | null
          youtube_video_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_playlists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "video_playlists_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "videos_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      v_student_resource_progress: {
        Row: {
          last_log_date: string | null
          percent: number | null
          questions_done: number | null
          questions_total: number | null
          resource_id: string | null
          sections_done: number | null
          sections_total: number | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_student_resource_sections"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_resource_sections: {
        Row: {
          done_at: string | null
          logs_count: number | null
          open_plan_item_id: string | null
          page_end: number | null
          page_start: number | null
          question_count: number | null
          resource_id: string | null
          resource_title: string | null
          resource_type: Database["public"]["Enums"]["resource_type"] | null
          section_id: string | null
          section_title: string | null
          sort_order: number | null
          student_id: string | null
          subject_color: string | null
          subject_id: string | null
          subject_name: string | null
          subject_short_name: string | null
          topic_id: string | null
          topic_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "resource_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_resources_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_setup_facts: {
        Row: {
          coach_id: string | null
          created_at: string | null
          has_active_goal: boolean | null
          has_published_plan_week: boolean | null
          has_schedule: boolean | null
          organization_id: string | null
          question_log_count: number | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_student_subject_pace: {
        Row: {
          minutes: number | null
          minutes_per_question: number | null
          questions: number | null
          student_id: string | null
          subject_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      v_student_subject_targets: {
        Row: {
          coach_id: string | null
          exam_question_count: number | null
          organization_id: string | null
          questions_done: number | null
          questions_target: number | null
          student_id: string | null
          subject_color: string | null
          subject_id: string | null
          subject_name: string | null
          subject_short_name: string | null
          subject_sort_order: number | null
          topics_done: number | null
          topics_expected: number | null
          topics_total: number | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_student_subject_weekly: {
        Row: {
          correct: number | null
          questions: number | null
          student_id: string | null
          subject_id: string | null
          week_start: string | null
          wrong: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "question_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
        ]
      }
      v_topic_alert_facts: {
        Row: {
          coach_id: string | null
          completed_at: string | null
          correct_window: number | null
          exam_question_count: number | null
          is_next_topic: boolean | null
          last_reviewed_at: string | null
          last_topic_log_date: string | null
          mistakes_window: number | null
          mock_recent_count: number | null
          mock_wrong_recent: number | null
          organization_id: string | null
          questions_window: number | null
          school_finish_on: string | null
          status: Database["public"]["Enums"]["topic_status"] | null
          status_changed_at: string | null
          student_first_log_date: string | null
          student_id: string | null
          subject_color: string | null
          subject_id: string | null
          subject_last_log_date: string | null
          subject_name: string | null
          subject_short_name: string | null
          subject_sort_order: number | null
          target_on: string | null
          topic_id: string | null
          topic_name: string | null
          topic_sort_order: number | null
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
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_topic_question_stats: {
        Row: {
          correct: number | null
          questions: number | null
          student_id: string | null
          topic_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "question_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
        ]
      }
      v_week_plan_topics: {
        Row: {
          student_id: string | null
          subject_id: string | null
          topic_id: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["subject_id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "plan_items_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_coach_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_mock_subject_stats"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_pace_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_setup_facts"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_subject_targets"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "weekly_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_topic_alert_facts"
            referencedColumns: ["student_id"]
          },
        ]
      }
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
      complete_plan_item: {
        Args: { p_item_id: string; p_log?: Json; p_note?: string }
        Returns: Json
      }
      copy_curriculum_template: {
        Args: {
          p_include_catalogs?: boolean
          p_new_name: string
          p_new_season: string
          p_template_id: string
        }
        Returns: string
      }
      copy_weekly_plan: {
        Args: {
          p_only_incomplete?: boolean
          p_source_plan_id: string
          p_target_student_ids: string[]
          p_week_start: string
        }
        Returns: Json
      }
      create_playlist: {
        Args: { p_assign_self?: boolean; p_playlist: Json; p_videos?: Json }
        Returns: string
      }
      create_resource: {
        Args: { p_assign_self?: boolean; p_resource: Json; p_sections?: Json }
        Returns: string
      }
      create_student_account: {
        Args: {
          p_actor_id: string
          p_auth_user_id: string
          p_coach_id: string
          p_curriculum_template_id: string
          p_exam_date: string
          p_full_name: string
          p_season: string
          p_username: string
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      import_playlist_videos: {
        Args: { p_playlist_id: string; p_videos: Json }
        Returns: Json
      }
      mark_video_watched: {
        Args: { p_student_id?: string; p_video_id: string; p_watched: boolean }
        Returns: Json
      }
      move_plan_item: {
        Args: { p_day: number; p_index: number; p_item_id: string }
        Returns: undefined
      }
      move_resource_section: {
        Args: { p_direction: string; p_section_id: string }
        Returns: undefined
      }
      move_topic: {
        Args: { p_direction: string; p_topic_id: string }
        Returns: undefined
      }
      postpone_plan_item: { Args: { p_item_id: string }; Returns: Json }
      save_mock_exam_result: {
        Args: { p_result: Json; p_subjects: Json; p_topic_ids?: string[] }
        Returns: string
      }
      set_plan_item_note: {
        Args: { p_item_id: string; p_note: string }
        Returns: undefined
      }
      set_plan_reflection: {
        Args: { p_plan_id: string; p_text: string }
        Returns: undefined
      }
      set_student_targets: {
        Args: {
          p_starts_on: string
          p_student_id: string
          p_subject_targets: Json
          p_topic_targets: Json
          p_topics_finish_by: string
        }
        Returns: Json
      }
      set_topic_school_dates: { Args: { p_rows: Json }; Returns: number }
      uncomplete_plan_item: { Args: { p_item_id: string }; Returns: Json }
    }
    Enums: {
      busy_slot_kind:
        | "school"
        | "tutoring_center"
        | "private_lesson"
        | "course"
        | "other"
      consent_type: "privacy_notice" | "explicit_consent" | "photo_upload"
      goal_metric: "questions"
      goal_period: "daily" | "weekly"
      mistake_reason:
        | "knowledge_gap"
        | "attention"
        | "time"
        | "misread_question"
        | "calculation"
        | "unknown"
      mistake_status: "open" | "solved"
      parent_relation: "mother" | "father" | "guardian" | "other"
      plan_item_kind:
        | "topic_study"
        | "questions"
        | "review"
        | "link"
        | "custom"
        | "section"
        | "video"
      plan_status: "draft" | "published"
      question_source: "resource" | "plan" | "school" | "online" | "free"
      resource_type:
        | "lecture_book"
        | "question_bank"
        | "worksheet"
        | "booklet"
        | "mock_book"
        | "other"
      student_status: "active" | "paused" | "archived"
      topic_alert_kind:
        | "knowledge_gap"
        | "low_accuracy"
        | "review_due"
        | "forgetting_risk"
        | "stale"
        | "not_started"
        | "neglected_subject"
        | "behind_school"
        | "mock_weak"
      topic_status:
        | "not_started"
        | "studying"
        | "completed"
        | "needs_review"
        | "mastered"
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
      busy_slot_kind: [
        "school",
        "tutoring_center",
        "private_lesson",
        "course",
        "other",
      ],
      consent_type: ["privacy_notice", "explicit_consent", "photo_upload"],
      goal_metric: ["questions"],
      goal_period: ["daily", "weekly"],
      mistake_reason: [
        "knowledge_gap",
        "attention",
        "time",
        "misread_question",
        "calculation",
        "unknown",
      ],
      mistake_status: ["open", "solved"],
      parent_relation: ["mother", "father", "guardian", "other"],
      plan_item_kind: [
        "topic_study",
        "questions",
        "review",
        "link",
        "custom",
        "section",
        "video",
      ],
      plan_status: ["draft", "published"],
      question_source: ["resource", "plan", "school", "online", "free"],
      resource_type: [
        "lecture_book",
        "question_bank",
        "worksheet",
        "booklet",
        "mock_book",
        "other",
      ],
      student_status: ["active", "paused", "archived"],
      topic_alert_kind: [
        "knowledge_gap",
        "low_accuracy",
        "review_due",
        "forgetting_risk",
        "stale",
        "not_started",
        "neglected_subject",
        "behind_school",
        "mock_weak",
      ],
      topic_status: [
        "not_started",
        "studying",
        "completed",
        "needs_review",
        "mastered",
      ],
      user_role: ["owner", "coach", "student", "parent"],
    },
  },
} as const

