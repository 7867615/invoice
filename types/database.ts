export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan_type: "free" | "pro" | "premium"
          tokens_remaining: number
          documents_uploaded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: "free" | "pro" | "premium"
          tokens_remaining?: number
          documents_uploaded?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: "free" | "pro" | "premium"
          tokens_remaining?: number
          documents_uploaded?: number
          created_at?: string
          updated_at?: string
        }
      }
      inspection_sessions: {
        Row: {
          id: string
          user_id: string
          session_name: string | null
          status: "draft" | "processing" | "completed" | "failed" | "partial"
          total_files: number
          processed_files: number
          failed_files: number
          total_tokens_used: number
          extraction_enabled: boolean
          auto_extract_on_upload: boolean
          extraction_priority: number
          last_extraction_check: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_name?: string | null
          status?: "draft" | "processing" | "completed" | "failed" | "partial"
          total_files?: number
          processed_files?: number
          failed_files?: number
          total_tokens_used?: number
          extraction_enabled?: boolean
          auto_extract_on_upload?: boolean
          extraction_priority?: number
          last_extraction_check?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_name?: string | null
          status?: "draft" | "processing" | "completed" | "failed" | "partial"
          total_files?: number
          processed_files?: number
          failed_files?: number
          total_tokens_used?: number
          extraction_enabled?: boolean
          auto_extract_on_upload?: boolean
          extraction_priority?: number
          last_extraction_check?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          filename: string
          file_size: number
          status: "uploaded" | "processing" | "completed" | "failed"
          upload_url: string | null
          extracted_data: Json | null
          extraction_status: "pending" | "queued" | "extracting" | "extracted" | "failed"
          extraction_job_id: string | null
          extraction_started_at: string | null
          extraction_completed_at: string | null
          extraction_error: string | null
          extraction_attempts: number
          max_extraction_attempts: number
          priority: number
          manual_extraction_requested: boolean
          tokens_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          filename: string
          file_size: number
          status?: "uploaded" | "processing" | "completed" | "failed"
          upload_url?: string | null
          extracted_data?: Json | null
          extraction_status?: "pending" | "queued" | "extracting" | "extracted" | "failed"
          extraction_job_id?: string | null
          extraction_started_at?: string | null
          extraction_completed_at?: string | null
          extraction_error?: string | null
          extraction_attempts?: number
          max_extraction_attempts?: number
          priority?: number
          manual_extraction_requested?: boolean
          tokens_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          filename?: string
          file_size?: number
          status?: "uploaded" | "processing" | "completed" | "failed"
          upload_url?: string | null
          extracted_data?: Json | null
          extraction_status?: "pending" | "queued" | "extracting" | "extracted" | "failed"
          extraction_job_id?: string | null
          extraction_started_at?: string | null
          extraction_completed_at?: string | null
          extraction_error?: string | null
          extraction_attempts?: number
          max_extraction_attempts?: number
          priority?: number
          manual_extraction_requested?: boolean
          tokens_used?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_documents_for_extraction: {
        Args: {
          p_limit?: number
          p_session_id?: string
        }
        Returns: {
          id: string
          user_id: string
          session_id: string
          filename: string
          upload_url: string
          priority: number
          extraction_attempts: number
          created_at: string
        }[]
      }
      mark_document_queued: {
        Args: {
          p_document_id: string
          p_job_id: string
        }
        Returns: boolean
      }
      mark_extraction_started: {
        Args: {
          p_document_id: string
        }
        Returns: boolean
      }
      mark_extraction_completed: {
        Args: {
          p_document_id: string
          p_extracted_data: Json
          p_tokens_used?: number
        }
        Returns: boolean
      }
      mark_extraction_failed: {
        Args: {
          p_document_id: string
          p_error_message: string
        }
        Returns: boolean
      }
      request_manual_extraction: {
        Args: {
          p_document_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      enable_session_extraction: {
        Args: {
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    ? (Database["public"]["Tables"] & Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
