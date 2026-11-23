export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BillingMode = 'PRE_PAY' | 'POST_PAY'
export type TableKind = 'dine_in' | 'counter'
export type OrderStatus =
  | 'awaiting_payment'
  | 'pending_approval'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'rejected'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'jazzcash' | 'easypaisa' | 'raast' | 'bank_transfer'
export type BellType = 'call_waiter' | 'need_water' | 'clean_table' | 'get_cutlery'
export type StaffRole = 'super_admin' | 'owner' | 'manager' | 'captain' | 'waiter' | 'kitchen'

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          name_ur: string | null
          slug: string
          timezone: string
          currency: string
          billing_mode: BillingMode
          tax_bps: number
          service_charge_bps: number
          kds_amber_minutes: number
          kds_late_minutes: number
          unpaid_alert_minutes: number
          show_halal_tag: boolean
          brand_color: string | null
          logo_url: string | null
          suspended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ur?: string | null
          slug: string
          timezone?: string
          currency?: string
          billing_mode?: BillingMode
          tax_bps?: number
          service_charge_bps?: number
          kds_amber_minutes?: number
          kds_late_minutes?: number
          unpaid_alert_minutes?: number
          show_halal_tag?: boolean
          brand_color?: string | null
          logo_url?: string | null
          suspended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ur?: string | null
          slug?: string
          timezone?: string
          currency?: string
          billing_mode?: BillingMode
          tax_bps?: number
          service_charge_bps?: number
          kds_amber_minutes?: number
          kds_late_minutes?: number
          unpaid_alert_minutes?: number
          show_halal_tag?: boolean
          brand_color?: string | null
          logo_url?: string | null
          suspended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_ur: string | null
          address: string | null
          phone: string | null
          billing_mode_override: BillingMode | null
          is_active: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_ur?: string | null
          address?: string | null
          phone?: string | null
          billing_mode_override?: BillingMode | null
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_ur?: string | null
          address?: string | null
          phone?: string | null
          billing_mode_override?: BillingMode | null
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      tables: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_number: string
          kind: TableKind
          capacity: number
          qr_token: string
          is_active: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_number: string
          kind?: TableKind
          capacity?: number
          qr_token?: string
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_number?: string
          kind?: TableKind
          capacity?: number
          qr_token?: string
          is_active?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tables_branch"
            columns: ["branch_id", "restaurant_id"]
            referencedRelation: "branches"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      table_sessions: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_id: string
          session_token: string
          status: 'active' | 'closed'
          opened_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_id: string
          session_token?: string
          status?: 'active' | 'closed'
          opened_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_id?: string
          session_token?: string
          status?: 'active' | 'closed'
          opened_at?: string
          closed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_table"
            columns: ["table_id", "restaurant_id"]
            referencedRelation: "tables"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_ur: string | null
          display_order: number
          is_hidden: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_ur?: string | null
          display_order?: number
          is_hidden?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_ur?: string | null
          display_order?: number
          is_hidden?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          name: string
          name_ur: string | null
          description: string | null
          description_ur: string | null
          base_price_paisa: number
          image_url: string | null
          dietary_tags: string[]
          allergens: string[]
          is_available: boolean
          is_archived: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id: string
          name: string
          name_ur?: string | null
          description?: string | null
          description_ur?: string | null
          base_price_paisa: number
          image_url?: string | null
          dietary_tags?: string[]
          allergens?: string[]
          is_available?: boolean
          is_archived?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          category_id?: string
          name?: string
          name_ur?: string | null
          description?: string | null
          description_ur?: string | null
          base_price_paisa?: number
          image_url?: string | null
          dietary_tags?: string[]
          allergens?: string[]
          is_available?: boolean
          is_archived?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_category"
            columns: ["category_id", "restaurant_id"]
            referencedRelation: "categories"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      modifier_groups: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          name_ur: string | null
          min_selections: number
          max_selections: number
          is_required: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          name_ur?: string | null
          min_selections?: number
          max_selections?: number
          is_required?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          name_ur?: string | null
          min_selections?: number
          max_selections?: number
          is_required?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      modifier_options: {
        Row: {
          id: string
          restaurant_id: string
          modifier_group_id: string
          name: string
          name_ur: string | null
          price_delta_paisa: number
          is_default: boolean
          is_available: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          modifier_group_id: string
          name: string
          name_ur?: string | null
          price_delta_paisa?: number
          is_default?: boolean
          is_available?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          modifier_group_id?: string
          name?: string
          name_ur?: string | null
          price_delta_paisa?: number
          is_default?: boolean
          is_available?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_modifier_options_group"
            columns: ["modifier_group_id", "restaurant_id"]
            referencedRelation: "modifier_groups"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      menu_item_modifier_groups: {
        Row: {
          restaurant_id: string
          menu_item_id: string
          modifier_group_id: string
          display_order: number
        }
        Insert: {
          restaurant_id: string
          menu_item_id: string
          modifier_group_id: string
          display_order?: number
        }
        Update: {
          restaurant_id?: string
          menu_item_id?: string
          modifier_group_id?: string
          display_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_mimg_item"
            columns: ["menu_item_id", "restaurant_id"]
            referencedRelation: "menu_items"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "fk_mimg_group"
            columns: ["modifier_group_id", "restaurant_id"]
            referencedRelation: "modifier_groups"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      branch_menu_item_overrides: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          menu_item_id: string
          is_sold_out: boolean
          price_override_paisa: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          menu_item_id: string
          is_sold_out?: boolean
          price_override_paisa?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          menu_item_id?: string
          is_sold_out?: boolean
          price_override_paisa?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bmio_branch"
            columns: ["branch_id", "restaurant_id"]
            referencedRelation: "branches"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "fk_bmio_item"
            columns: ["menu_item_id", "restaurant_id"]
            referencedRelation: "menu_items"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      branch_order_counters: {
        Row: {
          restaurant_id: string
          branch_id: string
          counter_date: string
          last_order_number: number
        }
        Insert: {
          restaurant_id: string
          branch_id: string
          counter_date: string
          last_order_number?: number
        }
        Update: {
          restaurant_id?: string
          branch_id?: string
          counter_date?: string
          last_order_number?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_id: string
          table_session_id: string
          daily_order_number: number
          idempotency_key: string | null
          device_fingerprint: string | null
          status: OrderStatus
          billing_mode: BillingMode
          subtotal_paisa: number
          tax_paisa: number
          service_charge_paisa: number
          discount_paisa: number
          total_paisa: number
          rejection_reason: string | null
          cancellation_reason: string | null
          estimated_prep_minutes: number | null
          locked_by_staff_id: string | null
          placed_at: string
          accepted_at: string | null
          preparing_at: string | null
          ready_at: string | null
          served_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_id: string
          table_session_id: string
          daily_order_number: number
          idempotency_key?: string | null
          device_fingerprint?: string | null
          status: OrderStatus
          billing_mode: BillingMode
          subtotal_paisa?: number
          tax_paisa?: number
          service_charge_paisa?: number
          discount_paisa?: number
          total_paisa?: number
          rejection_reason?: string | null
          cancellation_reason?: string | null
          estimated_prep_minutes?: number | null
          locked_by_staff_id?: string | null
          placed_at?: string
          accepted_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_id?: string
          table_session_id?: string
          daily_order_number?: number
          idempotency_key?: string | null
          device_fingerprint?: string | null
          status?: OrderStatus
          billing_mode?: BillingMode
          subtotal_paisa?: number
          tax_paisa?: number
          service_charge_paisa?: number
          discount_paisa?: number
          total_paisa?: number
          rejection_reason?: string | null
          cancellation_reason?: string | null
          estimated_prep_minutes?: number | null
          locked_by_staff_id?: string | null
          placed_at?: string
          accepted_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_table"
            columns: ["table_id", "restaurant_id"]
            referencedRelation: "tables"
            referencedColumns: ["id", "restaurant_id"]
          },
          {
            foreignKeyName: "fk_orders_session"
            columns: ["table_session_id", "restaurant_id"]
            referencedRelation: "table_sessions"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          restaurant_id: string
          order_id: string
          menu_item_id: string
          name_snapshot: string
          unit_price_paisa: number
          quantity: number
          modifiers_snapshot: Json
          notes: string | null
          total_paisa: number
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          order_id: string
          menu_item_id: string
          name_snapshot: string
          unit_price_paisa: number
          quantity: number
          modifiers_snapshot?: Json
          notes?: string | null
          total_paisa: number
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          order_id?: string
          menu_item_id?: string
          name_snapshot?: string
          unit_price_paisa?: number
          quantity?: number
          modifiers_snapshot?: Json
          notes?: string | null
          total_paisa?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id", "restaurant_id"]
            referencedRelation: "orders"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      order_status_events: {
        Row: {
          id: string
          restaurant_id: string
          order_id: string
          from_status: OrderStatus | null
          to_status: OrderStatus
          actor_type: 'guest' | 'staff' | 'system'
          actor_id: string | null
          actor_name: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          order_id: string
          from_status?: OrderStatus | null
          to_status: OrderStatus
          actor_type: 'guest' | 'staff' | 'system'
          actor_id?: string | null
          actor_name?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          order_id?: string
          from_status?: OrderStatus | null
          to_status?: OrderStatus
          actor_type?: 'guest' | 'staff' | 'system'
          actor_id?: string | null
          actor_name?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_status_events_order"
            columns: ["order_id", "restaurant_id"]
            referencedRelation: "orders"
            referencedColumns: ["id", "restaurant_id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          order_id: string | null
          table_session_id: string | null
          amount_paisa: number
          tip_paisa: number
          payment_method: PaymentMethod
          status: PaymentStatus
          reference_number: string | null
          notes: string | null
          collected_by_staff_id: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          order_id?: string | null
          table_session_id?: string | null
          amount_paisa: number
          tip_paisa?: number
          payment_method: PaymentMethod
          status?: PaymentStatus
          reference_number?: string | null
          notes?: string | null
          collected_by_staff_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          order_id?: string | null
          table_session_id?: string | null
          amount_paisa?: number
          tip_paisa?: number
          payment_method?: PaymentMethod
          status?: PaymentStatus
          reference_number?: string | null
          notes?: string | null
          collected_by_staff_id?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_bells: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_id: string
          table_session_id: string
          bell_type: BellType
          status: 'pending' | 'acknowledged' | 'resolved'
          handled_by_staff_id: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_id: string
          table_session_id: string
          bell_type: BellType
          status?: 'pending' | 'acknowledged' | 'resolved'
          handled_by_staff_id?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_id?: string
          table_session_id?: string
          bell_type?: BellType
          status?: 'pending' | 'acknowledged' | 'resolved'
          handled_by_staff_id?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          table_session_id: string
          order_id: string | null
          rating: number
          comments: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          table_session_id: string
          order_id?: string | null
          rating: number
          comments?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          table_session_id?: string
          order_id?: string | null
          rating?: number
          comments?: string | null
          created_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string | null
          auth_user_id: string | null
          username: string | null
          email: string | null
          full_name: string
          role: StaffRole
          must_change_password: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id?: string | null
          auth_user_id?: string | null
          username?: string | null
          email?: string | null
          full_name: string
          role: StaffRole
          must_change_password?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string | null
          auth_user_id?: string | null
          username?: string | null
          email?: string | null
          full_name?: string
          role?: StaffRole
          must_change_password?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_agents: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          device_name: string
          token_hash: string
          is_active: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          device_name: string
          token_hash: string
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          device_name?: string
          token_hash?: string
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          id: string
          restaurant_id: string
          branch_id: string
          print_agent_id: string | null
          job_type: 'kitchen_ticket' | 'customer_receipt' | 'bill'
          payload: Json
          status: 'pending' | 'printed' | 'failed'
          retry_count: number
          created_at: string
          printed_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          branch_id: string
          print_agent_id?: string | null
          job_type: 'kitchen_ticket' | 'customer_receipt' | 'bill'
          payload: Json
          status?: 'pending' | 'printed' | 'failed'
          retry_count?: number
          created_at?: string
          printed_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          branch_id?: string
          print_agent_id?: string | null
          job_type?: 'kitchen_ticket' | 'customer_receipt' | 'bill'
          payload?: Json
          status?: 'pending' | 'printed' | 'failed'
          retry_count?: number
          created_at?: string
          printed_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price_paisa: number
          features: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          price_paisa: number
          features?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_paisa?: number
          features?: Json
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      restaurant_subscriptions: {
        Row: {
          id: string
          restaurant_id: string
          plan_id: string
          status: 'trialing' | 'active' | 'past_due' | 'canceled'
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          plan_id: string
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          current_period_start: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          plan_id?: string
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          current_period_start?: string
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          restaurant_id: string | null
          key: string
          is_enabled: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id?: string | null
          key: string
          is_enabled?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string | null
          key?: string
          is_enabled?: boolean
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          id: string
          restaurant_id: string
          code: string
          discount_type: 'fixed_paisa' | 'percentage_bps'
          discount_value: number
          min_order_paisa: number
          max_discount_paisa: number | null
          valid_from: string
          valid_until: string
          usage_limit: number | null
          times_used: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          code: string
          discount_type: 'fixed_paisa' | 'percentage_bps'
          discount_value: number
          min_order_paisa?: number
          max_discount_paisa?: number | null
          valid_from: string
          valid_until: string
          usage_limit?: number | null
          times_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          code?: string
          discount_type?: 'fixed_paisa' | 'percentage_bps'
          discount_value?: number
          min_order_paisa?: number
          max_discount_paisa?: number | null
          valid_from?: string
          valid_until?: string
          usage_limit?: number | null
          times_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_daily_order_number: {
        Args: {
          p_branch_id: string
          p_restaurant_id: string
        }
        Returns: number
      }
      transition_order_status: {
        Args: {
          p_order_id: string
          p_expected_current_status: OrderStatus
          p_new_status: OrderStatus
          p_reason?: string | null
          p_prep_minutes?: number | null
        }
        Returns: Json
      }
      current_staff_restaurant_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      current_staff_branch_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      current_staff_role: {
        Args: Record<PropertyKey, never>
        Returns: StaffRole | null
      }
    }
    Enums: {
      billing_mode: BillingMode
      table_kind: TableKind
      order_status: OrderStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      bell_type: BellType
      staff_role: StaffRole
    }
    CompositeTypes: Record<string, never>
  }
}
