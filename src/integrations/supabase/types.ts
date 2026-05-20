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
      customer_profiles: {
        Row: {
          created_at: string | null
          id: string
          isnet_required: boolean | null
          payment_terms: string | null
          preferred_vendors: string[] | null
          purchase_order_required: boolean | null
          safety_requirements: Json | null
          site_addresses: Json | null
          twic_required: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          isnet_required?: boolean | null
          payment_terms?: string | null
          preferred_vendors?: string[] | null
          purchase_order_required?: boolean | null
          safety_requirements?: Json | null
          site_addresses?: Json | null
          twic_required?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          isnet_required?: boolean | null
          payment_terms?: string | null
          preferred_vendors?: string[] | null
          purchase_order_required?: boolean | null
          safety_requirements?: Json | null
          site_addresses?: Json | null
          twic_required?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          available: boolean | null
          category: string | null
          compliance_tags: string[] | null
          created_at: string | null
          daily_rate: number | null
          delivery_radius_miles: number | null
          description: string | null
          hazmat_certified: boolean | null
          id: string
          image_url: string | null
          location: string | null
          minimum_rental_days: number | null
          requires_operator: boolean | null
          response_time_hours: number | null
          specifications: Json | null
          title: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          daily_rate?: number | null
          delivery_radius_miles?: number | null
          description?: string | null
          hazmat_certified?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          minimum_rental_days?: number | null
          requires_operator?: boolean | null
          response_time_hours?: number | null
          specifications?: Json | null
          title: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          daily_rate?: number | null
          delivery_radius_miles?: number | null
          description?: string | null
          hazmat_certified?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          minimum_rental_days?: number | null
          requires_operator?: boolean | null
          response_time_hours?: number | null
          specifications?: Json | null
          title?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          company_type: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          profile_completion_score: number | null
          role_type: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          profile_completion_score?: number | null
          role_type?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          company_type?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          profile_completion_score?: number | null
          role_type?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_requests: {
        Row: {
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          end_date: string | null
          equipment_id: string | null
          id: string
          quote_expires_at: string | null
          special_requirements: string | null
          start_date: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          quote_expires_at?: string | null
          special_requirements?: string | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          quote_expires_at?: string | null
          special_requirements?: string | null
          start_date?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_draft_quotes: {
        Row: {
          add_on_options: Json | null
          compliance_notes: string[] | null
          created_at: string | null
          customer_id: string
          delivery_end_date: string
          delivery_start_date: string
          delivery_zip_code: string
          duration_days: number
          equipment_type: string
          estimated_daily_rate: number | null
          estimated_delivery_fee: number | null
          id: string
          job_type: string
          matched_vendor_id: string | null
          matched_vendor_location: string | null
          matched_vendor_name: string | null
          site_requirements: string[] | null
          special_instructions: string | null
          status: string | null
          updated_at: string | null
          vendor_adjusted_rate: number | null
          vendor_confirmed: boolean | null
          vendor_notes: string | null
        }
        Insert: {
          add_on_options?: Json | null
          compliance_notes?: string[] | null
          created_at?: string | null
          customer_id: string
          delivery_end_date: string
          delivery_start_date: string
          delivery_zip_code: string
          duration_days: number
          equipment_type: string
          estimated_daily_rate?: number | null
          estimated_delivery_fee?: number | null
          id?: string
          job_type: string
          matched_vendor_id?: string | null
          matched_vendor_location?: string | null
          matched_vendor_name?: string | null
          site_requirements?: string[] | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_adjusted_rate?: number | null
          vendor_confirmed?: boolean | null
          vendor_notes?: string | null
        }
        Update: {
          add_on_options?: Json | null
          compliance_notes?: string[] | null
          created_at?: string | null
          customer_id?: string
          delivery_end_date?: string
          delivery_start_date?: string
          delivery_zip_code?: string
          duration_days?: number
          equipment_type?: string
          estimated_daily_rate?: number | null
          estimated_delivery_fee?: number | null
          id?: string
          job_type?: string
          matched_vendor_id?: string | null
          matched_vendor_location?: string | null
          matched_vendor_name?: string | null
          site_requirements?: string[] | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_adjusted_rate?: number | null
          vendor_confirmed?: boolean | null
          vendor_notes?: string | null
        }
        Relationships: []
      }
      smart_match_requests: {
        Row: {
          additional_requirements: Json | null
          created_at: string | null
          customer_id: string
          equipment_type: string
          id: string
          location: string
          matched_vendors: Json | null
          status: string | null
          updated_at: string | null
          urgency: string
        }
        Insert: {
          additional_requirements?: Json | null
          created_at?: string | null
          customer_id: string
          equipment_type: string
          id?: string
          location: string
          matched_vendors?: Json | null
          status?: string | null
          updated_at?: string | null
          urgency: string
        }
        Update: {
          additional_requirements?: Json | null
          created_at?: string | null
          customer_id?: string
          equipment_type?: string
          id?: string
          location?: string
          matched_vendors?: Json | null
          status?: string | null
          updated_at?: string | null
          urgency?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      vendor_profiles: {
        Row: {
          business_license: string | null
          compliance_score: number | null
          coverage_areas: string[] | null
          created_at: string | null
          id: string
          insurance_policy: string | null
          performance_rating: number | null
          response_time_avg: number | null
          specialties: string[] | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          business_license?: string | null
          compliance_score?: number | null
          coverage_areas?: string[] | null
          created_at?: string | null
          id?: string
          insurance_policy?: string | null
          performance_rating?: number | null
          response_time_avg?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          business_license?: string | null
          compliance_score?: number | null
          coverage_areas?: string[] | null
          created_at?: string | null
          id?: string
          insurance_policy?: string | null
          performance_rating?: number | null
          response_time_avg?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin" | "manager"
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
      app_role: ["customer", "vendor", "admin", "manager"],
    },
  },
} as const
