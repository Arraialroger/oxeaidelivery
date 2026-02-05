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
      addresses: {
        Row: {
          address_source: string | null
          complement: string | null
          complement_point: string | null
          complemento: string | null
          created_at: string | null
          customer_id: string | null
          delivery_zone_id: string | null
          formatted_address: string | null
          id: string
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          place_id: string | null
          ponto_referencia: string | null
          reference: string | null
          reference_point: string | null
          restaurant_id: string | null
          street: string
        }
        Insert: {
          address_source?: string | null
          complement?: string | null
          complement_point?: string | null
          complemento?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_zone_id?: string | null
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          place_id?: string | null
          ponto_referencia?: string | null
          reference?: string | null
          reference_point?: string | null
          restaurant_id?: string | null
          street: string
        }
        Update: {
          address_source?: string | null
          complement?: string | null
          complement_point?: string | null
          complemento?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_zone_id?: string | null
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          place_id?: string | null
          ponto_referencia?: string | null
          reference?: string | null
          reference_point?: string | null
          restaurant_id?: string | null
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string | null
          restaurant_id: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          restaurant_id: string
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          order_index: number | null
          restaurant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          order_index?: number | null
          restaurant_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_index?: number | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_events: {
        Row: {
          created_at: string | null
          customer_phone: string | null
          event_type: string
          id: string
          metadata: Json | null
          restaurant_id: string
          session_id: string | null
          step_name: string | null
        }
        Insert: {
          created_at?: string | null
          customer_phone?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          restaurant_id: string
          session_id?: string | null
          step_name?: string | null
        }
        Update: {
          created_at?: string | null
          customer_phone?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          restaurant_id?: string
          session_id?: string | null
          step_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_slot_products: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          price_difference: number | null
          product_id: string
          slot_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          price_difference?: number | null
          product_id: string
          slot_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          price_difference?: number | null
          product_id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_slot_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_slot_products_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "combo_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_slots: {
        Row: {
          category_id: string | null
          combo_id: string
          created_at: string | null
          id: string
          quantity: number | null
          slot_label: string
          slot_order: number | null
        }
        Insert: {
          category_id?: string | null
          combo_id: string
          created_at?: string | null
          id?: string
          quantity?: number | null
          slot_label: string
          slot_order?: number | null
        }
        Update: {
          category_id?: string | null
          combo_id?: string
          created_at?: string | null
          id?: string
          quantity?: number | null
          slot_label?: string
          slot_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "combo_slots_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_slots_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          delivery_fee: number | null
          hero_banner_url: string | null
          id: number
          kds_enabled: boolean | null
          loyalty_enabled: boolean | null
          loyalty_min_order: number | null
          loyalty_reward_value: number | null
          loyalty_stamps_goal: number | null
          restaurant_open: boolean | null
        }
        Insert: {
          delivery_fee?: number | null
          hero_banner_url?: string | null
          id: number
          kds_enabled?: boolean | null
          loyalty_enabled?: boolean | null
          loyalty_min_order?: number | null
          loyalty_reward_value?: number | null
          loyalty_stamps_goal?: number | null
          restaurant_open?: boolean | null
        }
        Update: {
          delivery_fee?: number | null
          hero_banner_url?: string | null
          id?: number
          kds_enabled?: boolean | null
          loyalty_enabled?: boolean | null
          loyalty_min_order?: number | null
          loyalty_reward_value?: number | null
          loyalty_stamps_goal?: number | null
          restaurant_open?: boolean | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          customer_type: string | null
          id: string
          last_login: string | null
          last_stamp_at: string | null
          name: string | null
          phone: string
          restaurant_id: string | null
          stamps_count: number | null
          stamps_expire_at: string | null
          stamps_redeemed: number | null
        }
        Insert: {
          created_at?: string | null
          customer_type?: string | null
          id?: string
          last_login?: string | null
          last_stamp_at?: string | null
          name?: string | null
          phone: string
          restaurant_id?: string | null
          stamps_count?: number | null
          stamps_expire_at?: string | null
          stamps_redeemed?: number | null
        }
        Update: {
          created_at?: string | null
          customer_type?: string | null
          id?: string
          last_login?: string | null
          last_stamp_at?: string | null
          name?: string | null
          phone?: string
          restaurant_id?: string | null
          stamps_count?: number | null
          stamps_expire_at?: string | null
          stamps_redeemed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts_log: {
        Row: {
          created_at: string | null
          customer_phone: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nearest_zone_id: string | null
          rejection_reason: string | null
          requested_address: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nearest_zone_id?: string | null
          rejection_reason?: string | null
          requested_address?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nearest_zone_id?: string | null
          rejection_reason?: string | null
          requested_address?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_log_nearest_zone_id_fkey"
            columns: ["nearest_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          cep_prefix: string | null
          created_at: string | null
          delivery_fee_override: number | null
          estimated_delivery_time: number | null
          free_delivery_above: number | null
          id: string
          is_active: boolean | null
          is_polygon: boolean | null
          min_order_value: number | null
          neighborhood: string
          polygon_coords: Json | null
          radius_km: number | null
          restaurant_id: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          cep_prefix?: string | null
          created_at?: string | null
          delivery_fee_override?: number | null
          estimated_delivery_time?: number | null
          free_delivery_above?: number | null
          id?: string
          is_active?: boolean | null
          is_polygon?: boolean | null
          min_order_value?: number | null
          neighborhood: string
          polygon_coords?: Json | null
          radius_km?: number | null
          restaurant_id: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          cep_prefix?: string | null
          created_at?: string | null
          delivery_fee_override?: number | null
          estimated_delivery_time?: number | null
          free_delivery_above?: number | null
          id?: string
          is_active?: boolean | null
          is_polygon?: boolean | null
          min_order_value?: number | null
          neighborhood?: string
          polygon_coords?: Json | null
          radius_km?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      kds_events: {
        Row: {
          created_at: string | null
          event: string | null
          id: string
          order_id: string | null
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string | null
          event?: string | null
          id?: string
          order_id?: string | null
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string | null
          id?: string
          order_id?: string | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kds_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          id: string
          option_name: string | null
          option_price: number | null
          order_item_id: string | null
        }
        Insert: {
          id?: string
          option_name?: string | null
          option_price?: number | null
          order_item_id?: string | null
        }
        Update: {
          id?: string
          option_name?: string | null
          option_price?: number | null
          order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          note: string | null
          order_id: string | null
          product_id: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          cancellation_reason: string | null
          change: string | null
          created_at: string | null
          customer_id: string | null
          delivery_fee: number | null
          id: string
          loyalty_discount: number | null
          payment_method: string | null
          pix_proof_url: string | null
          restaurant_id: string | null
          stamp_earned: boolean | null
          stamp_redeemed: boolean | null
          status: string | null
          subtotal: number | null
          total: number | null
          troco: string | null
        }
        Insert: {
          address_id?: string | null
          cancellation_reason?: string | null
          change?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_fee?: number | null
          id?: string
          loyalty_discount?: number | null
          payment_method?: string | null
          pix_proof_url?: string | null
          restaurant_id?: string | null
          stamp_earned?: boolean | null
          stamp_redeemed?: boolean | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          troco?: string | null
        }
        Update: {
          address_id?: string | null
          cancellation_reason?: string | null
          change?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_fee?: number | null
          id?: string
          loyalty_discount?: number | null
          payment_method?: string | null
          pix_proof_url?: string | null
          restaurant_id?: string | null
          stamp_earned?: boolean | null
          stamp_redeemed?: boolean | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          troco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          group_name: string | null
          id: string
          name: string
          price: number | null
          product_id: string | null
          restaurant_id: string | null
          type: string
        }
        Insert: {
          group_name?: string | null
          id?: string
          name: string
          price?: number | null
          product_id?: string | null
          restaurant_id?: string | null
          type: string
        }
        Update: {
          group_name?: string | null
          id?: string
          name?: string
          price?: number | null
          product_id?: string | null
          restaurant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_combo: boolean | null
          name: string
          order_index: number | null
          price: number
          restaurant_id: string | null
        }
        Insert: {
          category_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combo?: boolean | null
          name: string
          order_index?: number | null
          price: number
          restaurant_id?: string | null
        }
        Update: {
          category_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combo?: boolean | null
          name?: string
          order_index?: number | null
          price?: number
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          expires_at: string | null
          id: string
          order_id: string | null
          p256dh: string
          restaurant_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          p256dh: string
          restaurant_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          p256dh?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accepted_payments: string[] | null
          address: string | null
          avg_delivery_time: number | null
          category: string | null
          created_at: string | null
          description: string | null
          facebook: string | null
          gallery_urls: string[] | null
          hero_banner_url: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          min_order: number | null
          name: string
          owner_id: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          status: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          accepted_payments?: string[] | null
          address?: string | null
          avg_delivery_time?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          gallery_urls?: string[] | null
          hero_banner_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          min_order?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          accepted_payments?: string[] | null
          address?: string | null
          avg_delivery_time?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          facebook?: string | null
          gallery_urls?: string[] | null
          hero_banner_url?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          min_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      sms_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          phone: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          phone: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          phone?: string
        }
        Relationships: []
      }
      stamp_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          customer_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          restaurant_id: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          restaurant_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          restaurant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamp_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      classify_customer_type: {
        Args: { customer_uuid: string }
        Returns: string
      }
      cleanup_expired_push_subscriptions: { Args: never; Returns: undefined }
      cleanup_expired_sms_codes: { Args: never; Returns: undefined }
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_valid_restaurant: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
