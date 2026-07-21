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
      audit_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          actor_type: string
          correlation_id: string
          created_at: string
          entity_id: string
          entity_type: string
          event_category: string
          event_type: string
          event_version: number
          id: string
          is_simulated: boolean
          metadata: Json
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          related_customer_organization_id: string | null
          related_equipment_id: string | null
          related_rfq_id: string | null
          related_vendor_organization_id: string | null
          severity: string
          source: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          actor_type: string
          correlation_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          event_category: string
          event_type: string
          event_version?: number
          id?: string
          is_simulated?: boolean
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          related_customer_organization_id?: string | null
          related_equipment_id?: string | null
          related_rfq_id?: string | null
          related_vendor_organization_id?: string | null
          severity?: string
          source: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          correlation_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_category?: string
          event_type?: string
          event_version?: number
          id?: string
          is_simulated?: boolean
          metadata?: Json
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          related_customer_organization_id?: string | null
          related_equipment_id?: string | null
          related_rfq_id?: string | null
          related_vendor_organization_id?: string | null
          severity?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_related_customer_organization_id_fkey"
            columns: ["related_customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_related_equipment_id_fkey"
            columns: ["related_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_related_rfq_id_fkey"
            columns: ["related_rfq_id"]
            isOneToOne: false
            referencedRelation: "rental_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_related_vendor_organization_id_fkey"
            columns: ["related_vendor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      notification_events: {
        Row: {
          audit_event_id: string | null
          channel: string
          correlation_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          id: string
          is_simulated: boolean
          message: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          audit_event_id?: string | null
          channel?: string
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          is_simulated?: boolean
          message?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          audit_event_id?: string | null
          channel?: string
          correlation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          is_simulated?: boolean
          message?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_audit_event_id_fkey"
            columns: ["audit_event_id"]
            isOneToOne: false
            referencedRelation: "audit_events"
            referencedColumns: ["id"]
          },
        ]
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
      organization_memberships: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_simulated: boolean
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string | null
          created_at: string
          id: string
          is_simulated: boolean
          name: string
          org_type: Database["public"]["Enums"]["organization_type"]
          phone: string | null
          primary_contact_user_id: string | null
          slug: string | null
          state: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          name: string
          org_type: Database["public"]["Enums"]["organization_type"]
          phone?: string | null
          primary_contact_user_id?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          name?: string
          org_type?: Database["public"]["Enums"]["organization_type"]
          phone?: string | null
          primary_contact_user_id?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          closed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string
          customer_organization_id: string | null
          delivery_address: string | null
          end_date: string | null
          equipment_id: string | null
          id: string
          is_simulated: boolean
          off_rent_at: string | null
          on_rent_at: string | null
          operational_status: Database["public"]["Enums"]["app_rfq_status"]
          quote_expires_at: string | null
          special_requirements: string | null
          start_date: string | null
          submitted_at: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_organization_id?: string | null
          delivery_address?: string | null
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          is_simulated?: boolean
          off_rent_at?: string | null
          on_rent_at?: string | null
          operational_status?: Database["public"]["Enums"]["app_rfq_status"]
          quote_expires_at?: string | null
          special_requirements?: string | null
          start_date?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_organization_id?: string | null
          delivery_address?: string | null
          end_date?: string | null
          equipment_id?: string | null
          id?: string
          is_simulated?: boolean
          off_rent_at?: string | null
          on_rent_at?: string | null
          operational_status?: Database["public"]["Enums"]["app_rfq_status"]
          quote_expires_at?: string | null
          special_requirements?: string | null
          start_date?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_requests_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_operational_status: {
        Row: {
          actor_role: string | null
          audit_event_id: string | null
          correlation_id: string
          created_at: string
          id: string
          is_simulated: boolean
          new_status: Database["public"]["Enums"]["app_rfq_status"]
          previous_status: Database["public"]["Enums"]["app_rfq_status"] | null
          reason: string | null
          rfq_id: string
          transitioned_by: string | null
        }
        Insert: {
          actor_role?: string | null
          audit_event_id?: string | null
          correlation_id: string
          created_at?: string
          id?: string
          is_simulated?: boolean
          new_status: Database["public"]["Enums"]["app_rfq_status"]
          previous_status?: Database["public"]["Enums"]["app_rfq_status"] | null
          reason?: string | null
          rfq_id: string
          transitioned_by?: string | null
        }
        Update: {
          actor_role?: string | null
          audit_event_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          is_simulated?: boolean
          new_status?: Database["public"]["Enums"]["app_rfq_status"]
          previous_status?: Database["public"]["Enums"]["app_rfq_status"] | null
          reason?: string | null
          rfq_id?: string
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_operational_status_audit_event_id_fkey"
            columns: ["audit_event_id"]
            isOneToOne: false
            referencedRelation: "audit_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_operational_status_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rental_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendor_invitations: {
        Row: {
          created_at: string
          id: string
          invitation_status: string
          invited_at: string
          invited_by: string
          is_simulated: boolean
          revoked_at: string | null
          rfq_id: string
          vendor_organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_status?: string
          invited_at?: string
          invited_by: string
          is_simulated?: boolean
          revoked_at?: string | null
          rfq_id: string
          vendor_organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_status?: string
          invited_at?: string
          invited_by?: string
          is_simulated?: boolean
          revoked_at?: string | null
          rfq_id?: string
          vendor_organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendor_invitations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rental_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendor_invitations_vendor_organization_id_fkey"
            columns: ["vendor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          is_simulated: boolean
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
          is_simulated?: boolean
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
          is_simulated?: boolean
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
      vendor_quote_responses: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          available_start_date: string | null
          compliance_confirmed: boolean
          compliance_notes: string[] | null
          created_at: string
          daily_rate: number | null
          delivery_fee: number | null
          equipment_id: string | null
          equipment_substitution: boolean
          id: string
          is_simulated: boolean
          minimum_rental_days: number | null
          mobilization_fee: number | null
          rejected_at: string | null
          rejected_by: string | null
          response_deadline: string | null
          rfq_id: string
          status: string
          submitted_at: string | null
          submitted_by: string
          substitution_notes: string | null
          updated_at: string
          vendor_notes: string | null
          vendor_organization_id: string
          version: number
          withdrawn_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          available_start_date?: string | null
          compliance_confirmed?: boolean
          compliance_notes?: string[] | null
          created_at?: string
          daily_rate?: number | null
          delivery_fee?: number | null
          equipment_id?: string | null
          equipment_substitution?: boolean
          id?: string
          is_simulated?: boolean
          minimum_rental_days?: number | null
          mobilization_fee?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          response_deadline?: string | null
          rfq_id: string
          status?: string
          submitted_at?: string | null
          submitted_by: string
          substitution_notes?: string | null
          updated_at?: string
          vendor_notes?: string | null
          vendor_organization_id: string
          version?: number
          withdrawn_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          available_start_date?: string | null
          compliance_confirmed?: boolean
          compliance_notes?: string[] | null
          created_at?: string
          daily_rate?: number | null
          delivery_fee?: number | null
          equipment_id?: string | null
          equipment_substitution?: boolean
          id?: string
          is_simulated?: boolean
          minimum_rental_days?: number | null
          mobilization_fee?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          response_deadline?: string | null
          rfq_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          substitution_notes?: string | null
          updated_at?: string
          vendor_notes?: string | null
          vendor_organization_id?: string
          version?: number
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quote_responses_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_responses_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_responses_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rental_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quote_responses_vendor_organization_id_fkey"
            columns: ["vendor_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      equipment_public: {
        Row: {
          available: boolean | null
          category: string | null
          city: string | null
          daily_rate: number | null
          description_teaser: string | null
          id: string | null
          image_url: string | null
          price_band: string | null
          price_range_label: string | null
          title: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          city?: never
          daily_rate?: number | null
          description_teaser?: never
          id?: string | null
          image_url?: string | null
          price_band?: never
          price_range_label?: never
          title?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          city?: never
          daily_rate?: number | null
          description_teaser?: never
          id?: string | null
          image_url?: string | null
          price_band?: never
          price_range_label?: never
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_has_any_active_rfq_invitation: {
        Args: { p_rfq_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_demo_actor: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_rfq_customer: {
        Args: { p_rfq_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_actor_type: string
          p_correlation_id: string
          p_entity_id: string
          p_entity_type: string
          p_event_category: string
          p_event_type: string
          p_is_simulated?: boolean
          p_metadata?: Json
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
          p_related_customer_organization_id?: string
          p_related_equipment_id?: string
          p_related_rfq_id?: string
          p_related_vendor_organization_id?: string
          p_severity?: string
          p_source?: string
        }
        Returns: string
      }
      rfq_vendor_has_accepted_quote: {
        Args: { p_rfq_id: string }
        Returns: boolean
      }
      submit_vendor_quote: {
        Args: {
          p_available_start_date?: string
          p_compliance_confirmed?: boolean
          p_compliance_notes?: string[]
          p_daily_rate: number
          p_delivery_fee?: number
          p_equipment_substitution?: boolean
          p_minimum_rental_days?: number
          p_mobilization_fee?: number
          p_rfq_id: string
          p_substitution_notes?: string
          p_vendor_notes?: string
          p_vendor_organization_id: string
        }
        Returns: {
          correlation_id: string
          quote_id: string
        }[]
      }
      transition_rfq_status: {
        Args: {
          p_actor_id: string
          p_actor_role?: string
          p_is_simulated?: boolean
          p_new_status: Database["public"]["Enums"]["app_rfq_status"]
          p_reason?: string
          p_rfq_id: string
          p_source?: string
          p_vqr_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_rfq_status:
        | "draft"
        | "submitted"
        | "pending_vendor_review"
        | "vendor_quote_received"
        | "quote_accepted"
        | "vendor_confirmed"
        | "mobilizing"
        | "in_transit"
        | "on_rent"
        | "rental_extended"
        | "off_rent_requested"
        | "demobilizing"
        | "off_rent"
        | "completed"
        | "cancelled"
        | "rejected"
      app_role: "customer" | "vendor" | "admin" | "manager"
      organization_type: "customer" | "vendor" | "both"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_rfq_status: [
        "draft",
        "submitted",
        "pending_vendor_review",
        "vendor_quote_received",
        "quote_accepted",
        "vendor_confirmed",
        "mobilizing",
        "in_transit",
        "on_rent",
        "rental_extended",
        "off_rent_requested",
        "demobilizing",
        "off_rent",
        "completed",
        "cancelled",
        "rejected",
      ],
      app_role: ["customer", "vendor", "admin", "manager"],
      organization_type: ["customer", "vendor", "both"],
    },
  },
} as const
