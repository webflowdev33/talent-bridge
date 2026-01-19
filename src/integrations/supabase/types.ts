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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_answer: string | null
          test_attempt_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_answer?: string | null
          test_attempt_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_answer?: string | null
          test_attempt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          admin_approved: boolean | null
          created_at: string | null
          current_round: number | null
          id: string
          job_id: string
          slot_id: string | null
          status: string | null
          test_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_approved?: boolean | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          job_id: string
          slot_id?: string | null
          status?: string | null
          test_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_approved?: boolean | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          job_id?: string
          slot_id?: string | null
          status?: string | null
          test_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          requirements: string | null
          salary_range: string | null
          title: string
          total_rounds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          requirements?: string | null
          salary_range?: string | null
          title: string
          total_rounds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string
          total_rounds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          profile_completed: boolean | null
          resume_url: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean | null
          resume_url?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean | null
          resume_url?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          job_id: string
          marks: number | null
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          question_text: string
          round_number: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          job_id: string
          marks?: number | null
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          question_text: string
          round_number?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          job_id?: string
          marks?: number | null
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          question_text?: string
          round_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          created_at: string | null
          current_capacity: number | null
          end_time: string
          id: string
          is_enabled: boolean | null
          job_id: string
          max_capacity: number | null
          slot_date: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          current_capacity?: number | null
          end_time: string
          id?: string
          is_enabled?: boolean | null
          job_id: string
          max_capacity?: number | null
          slot_date: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          current_capacity?: number | null
          end_time?: string
          id?: string
          is_enabled?: boolean | null
          job_id?: string
          max_capacity?: number | null
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          application_id: string
          auto_submitted: boolean | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          is_passed: boolean | null
          is_submitted: boolean | null
          obtained_marks: number | null
          passing_marks: number | null
          round_number: number | null
          started_at: string | null
          total_marks: number | null
          user_id: string
        }
        Insert: {
          application_id: string
          auto_submitted?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_passed?: boolean | null
          is_submitted?: boolean | null
          obtained_marks?: number | null
          passing_marks?: number | null
          round_number?: number | null
          started_at?: string | null
          total_marks?: number | null
          user_id: string
        }
        Update: {
          application_id?: string
          auto_submitted?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          is_passed?: boolean | null
          is_submitted?: boolean | null
          obtained_marks?: number | null
          passing_marks?: number | null
          round_number?: number | null
          started_at?: string | null
          total_marks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          application_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          token_value: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          token_value: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          token_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          created_at: string | null
          id: string
          test_attempt_id: string
          user_id: string
          violation_count: number | null
          violation_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          test_attempt_id: string
          user_id: string
          violation_count?: number | null
          violation_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          test_attempt_id?: string
          user_id?: string
          violation_count?: number | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
