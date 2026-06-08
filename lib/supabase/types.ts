export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          biz_name: string | null
          slug: string | null
          phone: string | null
          city: string | null
          address: string | null
          whatsapp: string | null
          low_level: number
          onboarded: boolean
          created_at: string
        }
        Insert: {
          id: string
          biz_name?: string | null
          slug?: string | null
          phone?: string | null
          city?: string | null
          address?: string | null
          whatsapp?: string | null
          low_level?: number
          onboarded?: boolean
          created_at?: string
        }
        Update: {
          biz_name?: string | null
          slug?: string | null
          phone?: string | null
          city?: string | null
          address?: string | null
          whatsapp?: string | null
          low_level?: number
          onboarded?: boolean
        }
      }
      medicines: {
        Row: {
          id: string
          dist_id: string
          code: string | null
          name: string
          company: string | null
          tp: number
          disc: number
          net: number
          bonus: string | null
          stock: number
          created_at: string
        }
        Insert: {
          id?: string
          dist_id: string
          code?: string | null
          name: string
          company?: string | null
          tp: number
          disc?: number
          bonus?: string | null
          stock?: number
          created_at?: string
        }
        Update: {
          code?: string | null
          name?: string
          company?: string | null
          tp?: number
          disc?: number
          bonus?: string | null
          stock?: number
        }
      }
      orders: {
        Row: {
          id: string
          dist_id: string
          pharmacy_name: string | null
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          total_before: number
          total_after: number
          item_count: number
          created_at: string
        }
        Insert: {
          id?: string
          dist_id: string
          pharmacy_name?: string | null
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          total_before?: number
          total_after?: number
          item_count?: number
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          medicine_id: string | null
          name: string
          code: string | null
          tp: number
          disc: number
          net: number
          qty: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: string
          medicine_id?: string | null
          name: string
          code?: string | null
          tp: number
          disc?: number
          net: number
          qty: number
          subtotal: number
        }
      }
    }
  }
}

// Convenience row types
export type Profile   = Database['public']['Tables']['profiles']['Row']
export type Medicine  = Database['public']['Tables']['medicines']['Row']
export type Order     = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
