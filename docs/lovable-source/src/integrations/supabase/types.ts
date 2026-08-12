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
      branches: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          institution_id: string
          lat: number | null
          lng: number | null
          name: string
          operating_end: string | null
          operating_start: string | null
          phone: string | null
          status: string
          weekly_hours: Json | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          lat?: number | null
          lng?: number | null
          name: string
          operating_end?: string | null
          operating_start?: string | null
          phone?: string | null
          status?: string
          weekly_hours?: Json | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          operating_end?: string | null
          operating_start?: string | null
          phone?: string | null
          status?: string
          weekly_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          lat: number | null
          license_key: string | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          state: string | null
          status: string
          subscription_plan: string | null
          type: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          license_key?: string | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          state?: string | null
          status?: string
          subscription_plan?: string | null
          type?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          license_key?: string | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          state?: string | null
          status?: string
          subscription_plan?: string | null
          type?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          institution_id: string
          issued_at: string
          line_items: Json
          notes: string | null
          number: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          issued_at?: string
          line_items?: Json
          notes?: string | null
          number: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          issued_at?: string
          line_items?: Json
          notes?: string | null
          number?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      libraries: {
        Row: {
          branch_id: string
          capacity: number | null
          created_at: string
          floor: number | null
          hours_exceptions: Json
          id: string
          name: string
          operating_end: string | null
          operating_start: string | null
          sections: Json | null
          status: string
          weekly_hours: Json | null
        }
        Insert: {
          branch_id: string
          capacity?: number | null
          created_at?: string
          floor?: number | null
          hours_exceptions?: Json
          id?: string
          name: string
          operating_end?: string | null
          operating_start?: string | null
          sections?: Json | null
          status?: string
          weekly_hours?: Json | null
        }
        Update: {
          branch_id?: string
          capacity?: number | null
          created_at?: string
          floor?: number | null
          hours_exceptions?: Json
          id?: string
          name?: string
          operating_end?: string | null
          operating_start?: string | null
          sections?: Json | null
          status?: string
          weekly_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "libraries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          branch_id: string
          created_at: string
          email: string | null
          fees_owed: number | null
          id: string
          institution_id: string
          join_date: string | null
          library_id: string
          name: string
          phone: string | null
          plan_id: string | null
          seat_id: string | null
          shift: Database["public"]["Enums"]["shift_t"] | null
          status: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          email?: string | null
          fees_owed?: number | null
          id?: string
          institution_id: string
          join_date?: string | null
          library_id: string
          name: string
          phone?: string | null
          plan_id?: string | null
          seat_id?: string | null
          shift?: Database["public"]["Enums"]["shift_t"] | null
          status?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          email?: string | null
          fees_owed?: number | null
          id?: string
          institution_id?: string
          join_date?: string | null
          library_id?: string
          name?: string
          phone?: string | null
          plan_id?: string | null
          seat_id?: string | null
          shift?: Database["public"]["Enums"]["shift_t"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string
          created_at: string
          exp_month: number
          exp_year: number
          holder: string
          id: string
          institution_id: string
          is_default: boolean
          last4: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          exp_month: number
          exp_year: number
          holder: string
          id?: string
          institution_id: string
          is_default?: boolean
          last4: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          exp_month?: number
          exp_year?: number
          holder?: string
          id?: string
          institution_id?: string
          is_default?: boolean
          last4?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_changes: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string | null
          from_plan_id: string | null
          id: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          to_plan_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_plan_id?: string | null
          id?: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          to_plan_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_plan_id?: string | null
          id?: string
          institution_id?: string
          person_id?: string
          person_type?: Database["public"]["Enums"]["person_type_t"]
          to_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_changes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          created_at: string
          features: Json | null
          id: string
          institution_id: string
          max_members: number | null
          max_seats: number | null
          name: string
          price: number
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          features?: Json | null
          id?: string
          institution_id: string
          max_members?: number | null
          max_seats?: number | null
          name: string
          price?: number
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          features?: Json | null
          id?: string
          institution_id?: string
          max_members?: number | null
          max_seats?: number | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      seats: {
        Row: {
          col: number | null
          created_at: string
          id: string
          library_id: string
          number: string
          row: number | null
          section: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          col?: number | null
          created_at?: string
          id?: string
          library_id: string
          number: string
          row?: number | null
          section?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          col?: number | null
          created_at?: string
          id?: string
          library_id?: string
          number?: string
          row?: number | null
          section?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_changes: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string | null
          from_shift: Database["public"]["Enums"]["shift_t"] | null
          id: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          to_shift: Database["public"]["Enums"]["shift_t"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_shift?: Database["public"]["Enums"]["shift_t"] | null
          id?: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          to_shift: Database["public"]["Enums"]["shift_t"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          from_shift?: Database["public"]["Enums"]["shift_t"] | null
          id?: string
          institution_id?: string
          person_id?: string
          person_type?: Database["public"]["Enums"]["person_type_t"]
          to_shift?: Database["public"]["Enums"]["shift_t"]
        }
        Relationships: [
          {
            foreignKeyName: "shift_changes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          branch_id: string
          class_grade: string | null
          created_at: string
          email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          institution_id: string
          join_date: string | null
          library_id: string
          name: string
          phone: string | null
          plan_id: string | null
          roll_no: string | null
          seat_id: string | null
          shift: Database["public"]["Enums"]["shift_t"] | null
          status: string | null
        }
        Insert: {
          branch_id: string
          class_grade?: string | null
          created_at?: string
          email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          institution_id: string
          join_date?: string | null
          library_id: string
          name: string
          phone?: string | null
          plan_id?: string | null
          roll_no?: string | null
          seat_id?: string | null
          shift?: Database["public"]["Enums"]["shift_t"] | null
          status?: string | null
        }
        Update: {
          branch_id?: string
          class_grade?: string | null
          created_at?: string
          email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          institution_id?: string
          join_date?: string | null
          library_id?: string
          name?: string
          phone?: string | null
          plan_id?: string | null
          roll_no?: string | null
          seat_id?: string | null
          shift?: Database["public"]["Enums"]["shift_t"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          branch_id: string
          created_at: string
          email: string | null
          id: string
          institution_id: string
          name: string
          phone: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          name: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_branch_id: string | null
          from_library_id: string | null
          from_seat_id: string | null
          id: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          reason: string | null
          to_branch_id: string | null
          to_library_id: string | null
          to_seat_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_branch_id?: string | null
          from_library_id?: string | null
          from_seat_id?: string | null
          id?: string
          institution_id: string
          person_id: string
          person_type: Database["public"]["Enums"]["person_type_t"]
          reason?: string | null
          to_branch_id?: string | null
          to_library_id?: string | null
          to_seat_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_branch_id?: string | null
          from_library_id?: string | null
          from_seat_id?: string | null
          id?: string
          institution_id?: string
          person_id?: string
          person_type?: Database["public"]["Enums"]["person_type_t"]
          reason?: string | null
          to_branch_id?: string | null
          to_library_id?: string | null
          to_seat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      owns_institution: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "org_admin" | "branch_admin" | "librarian"
      person_type_t: "member" | "student" | "teacher"
      shift_t: "Morning" | "Afternoon" | "Evening" | "Night"
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
      app_role: ["super_admin", "org_admin", "branch_admin", "librarian"],
      person_type_t: ["member", "student", "teacher"],
      shift_t: ["Morning", "Afternoon", "Evening", "Night"],
    },
  },
} as const
