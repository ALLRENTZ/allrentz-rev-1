
// Temporary type definitions until Supabase regenerates the schema
export interface Database {
  public: {
    Tables: {
      equipment: {
        Row: {
          id: string;
          vendor_id: string | null;
          title: string;
          description: string | null;
          category: string;
          daily_rate: number;
          location: string;
          available: boolean | null;
          image_url: string | null;
          specifications: any;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          title: string;
          description?: string | null;
          category: string;
          daily_rate: number;
          location: string;
          available?: boolean | null;
          image_url?: string | null;
          specifications?: any;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          vendor_id?: string | null;
          title?: string;
          description?: string | null;
          category?: string;
          daily_rate?: number;
          location?: string;
          available?: boolean | null;
          image_url?: string | null;
          specifications?: any;
          created_at?: string | null;
        };
      };
      rental_requests: {
        Row: {
          id: string;
          customer_id: string | null;
          equipment_id: string | null;
          start_date: string;
          end_date: string;
          total_amount: number | null;
          status: string | null;
          delivery_address: string | null;
          special_requirements: string | null;
          quote_expires_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          equipment_id?: string | null;
          start_date: string;
          end_date: string;
          total_amount?: number | null;
          status?: string | null;
          delivery_address?: string | null;
          special_requirements?: string | null;
          quote_expires_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          equipment_id?: string | null;
          start_date?: string;
          end_date?: string;
          total_amount?: number | null;
          status?: string | null;
          delivery_address?: string | null;
          special_requirements?: string | null;
          quote_expires_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
