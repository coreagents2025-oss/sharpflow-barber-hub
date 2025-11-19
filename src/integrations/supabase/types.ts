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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string
          barbershop_id: string
          client_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_at: string
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at: string
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          barbershop_id: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_commission_config: {
        Row: {
          apply_to_completed_only: boolean | null
          barber_id: string
          barbershop_id: string
          commission_type: string
          commission_value: number
          created_at: string | null
          id: string
          is_active: boolean | null
          minimum_services: number | null
          updated_at: string | null
        }
        Insert: {
          apply_to_completed_only?: boolean | null
          barber_id: string
          barbershop_id: string
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_services?: number | null
          updated_at?: string | null
        }
        Update: {
          apply_to_completed_only?: boolean | null
          barber_id?: string
          barbershop_id?: string
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_services?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_commission_config_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commission_config_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commission_config_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_commission_config_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          barbershop_id: string
          bio: string | null
          created_at: string
          id: string
          is_available: boolean | null
          name: string | null
          phone: string | null
          photo_url: string | null
          rating: number | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          bio?: string | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          bio?: string | null
          created_at?: string
          id?: string
          is_available?: boolean | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_credentials: {
        Row: {
          barbershop_id: string
          created_at: string
          email_credentials: Json
          email_sender: string | null
          updated_at: string
          whatsapp_credentials: Json
          whatsapp_phone: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          email_credentials?: Json
          email_sender?: string | null
          updated_at?: string
          whatsapp_credentials?: Json
          whatsapp_phone?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          email_credentials?: Json
          email_sender?: string | null
          updated_at?: string
          whatsapp_credentials?: Json
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_credentials_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_credentials_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_staff: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_staff_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_staff_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string | null
          created_at: string
          custom_domain: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow: {
        Row: {
          amount: number
          barbershop_id: string
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          barbershop_id: string
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          barbershop_id?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_settings: {
        Row: {
          barbershop_id: string
          created_at: string
          hero_image_url: string | null
          id: string
          logo_url: string | null
          services_order: Json | null
          show_popular_badge: boolean | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          services_order?: Json | null
          show_popular_badge?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          services_order?: Json | null
          show_popular_badge?: boolean | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string
          credits_remaining: number
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string
          credits_remaining?: number
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_records: {
        Row: {
          barber_id: string
          barbershop_id: string
          commission_amount: number
          created_at: string | null
          created_by: string | null
          final_amount: number
          id: string
          manual_adjustments: number | null
          metadata: Json | null
          notes: string | null
          payment_date: string | null
          period_end: string
          period_start: string
          status: string | null
          total_amount: number
          total_services: number
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          commission_amount?: number
          created_at?: string | null
          created_by?: string | null
          final_amount?: number
          id?: string
          manual_adjustments?: number | null
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_amount?: number
          total_services?: number
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          commission_amount?: number
          created_at?: string | null
          created_by?: string | null
          final_amount?: number
          id?: string
          manual_adjustments?: number | null
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_amount?: number
          total_services?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedules: {
        Row: {
          barbers_working: string[]
          barbershop_id: string
          blocked_slots: string[]
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          barbers_working?: string[]
          barbershop_id: string
          blocked_slots?: string[]
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          working_hours_end: string
          working_hours_start: string
        }
        Update: {
          barbers_working?: string[]
          barbershop_id?: string
          blocked_slots?: string[]
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedules_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedules_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          barbershop_id: string
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          sent_count: number | null
          subject: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          sent_count?: number | null
          subject: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          sent_count?: number | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          barbershop_id: string
          config: Json
          created_at: string
          id: string
          integration_type: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          config: Json
          created_at?: string
          id?: string
          integration_type: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          config?: Json
          created_at?: string
          id?: string
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          barbershop_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          last_interaction_at: string | null
          phone: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_interaction_at?: string | null
          phone: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_interaction_at?: string | null
          phone?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          barbershop_id: string
          client_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          payment_method: string
          status: string
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          barbershop_id: string
          client_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          payment_method: string
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          barbershop_id?: string
          client_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          payment_method?: string
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string
          barber_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
        }
        Insert: {
          appointment_id: string
          barber_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
        }
        Update: {
          appointment_id?: string
          barber_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments_with_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          barbershop_id: string
          category_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          barbershop_id: string
          created_at: string
          credits_per_month: number
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          credits_per_month: number
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          credits_per_month?: number
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          subscription_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          barbershop_id: string
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          retry_config: Json | null
          secret_key: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          retry_config?: Json | null
          secret_key: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          retry_config?: Json | null
          secret_key?: string
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          barbershop_id: string
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          status: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          client_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          barbershop_id: string
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          provider_message_id: string | null
          sent_by: string | null
          status: string | null
        }
        Insert: {
          barbershop_id: string
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type: string
          metadata?: Json | null
          provider_message_id?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          barbershop_id?: string
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          provider_message_id?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appointments_with_client: {
        Row: {
          barber_id: string | null
          barbershop_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_type: string | null
          created_at: string | null
          id: string | null
          lead_id: string | null
          lead_source: string | null
          lead_status: string | null
          notes: string | null
          scheduled_at: string | null
          service_id: string | null
          status: string | null
          unified_client_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "public_barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      public_barbers: {
        Row: {
          barbershop_id: string | null
          bio: string | null
          id: string | null
          is_available: boolean | null
          name: string | null
          photo_url: string | null
          rating: number | null
          specialty: string | null
        }
        Insert: {
          barbershop_id?: string | null
          bio?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Update: {
          barbershop_id?: string | null
          bio?: string | null
          id?: string | null
          is_available?: boolean | null
          name?: string | null
          photo_url?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "public_barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      public_barbershops: {
        Row: {
          address: string | null
          created_at: string | null
          custom_domain: string | null
          facebook_url: string | null
          id: string | null
          instagram_url: string | null
          logo_url: string | null
          name: string | null
          operating_hours: Json | null
          phone: string | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          custom_domain?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          name?: string | null
          operating_hours?: Json | null
          phone?: string | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          custom_domain?: string | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          name?: string | null
          operating_hours?: Json | null
          phone?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          full_name: string | null
          id: string | null
          phone: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_barber_commission: {
        Args: { _barber_id: string; _end_date: string; _start_date: string }
        Returns: {
          commission_amount: number
          total_amount: number
          total_services: number
        }[]
      }
      check_time_slot_available: {
        Args: {
          _barber_id: string
          _barbershop_id: string
          _duration_minutes?: number
          _scheduled_at: string
        }
        Returns: boolean
      }
      get_user_barbershop: { Args: { _user_id: string }; Returns: string }
      get_user_barbershops: {
        Args: { _user_id: string }
        Returns: {
          barbershop_id: string
        }[]
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
      app_role: "admin" | "barber" | "client"
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
      app_role: ["admin", "barber", "client"],
    },
  },
} as const
