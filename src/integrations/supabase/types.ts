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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          correlation_id: string | null
          id: string
          occurred_at: string
          payload: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          correlation_id?: string | null
          id?: string
          occurred_at?: string
          payload?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          correlation_id?: string | null
          id?: string
          occurred_at?: string
          payload?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      avkk_competence: {
        Row: {
          avkk_subject_id: string
          created_at: string
          created_by: string | null
          dimension_key_snapshot: string
          dimension_label_snapshot: string
          dimension_value_id: string
          id: string
          note: string
          rating_key_snapshot: string
          rating_label_snapshot: string
          rating_value_id: string
          superseded_at: string | null
          support_needed: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avkk_subject_id: string
          created_at?: string
          created_by?: string | null
          dimension_key_snapshot: string
          dimension_label_snapshot: string
          dimension_value_id: string
          id?: string
          note?: string
          rating_key_snapshot: string
          rating_label_snapshot: string
          rating_value_id: string
          superseded_at?: string | null
          support_needed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avkk_subject_id?: string
          created_at?: string
          created_by?: string | null
          dimension_key_snapshot?: string
          dimension_label_snapshot?: string
          dimension_value_id?: string
          id?: string
          note?: string
          rating_key_snapshot?: string
          rating_label_snapshot?: string
          rating_value_id?: string
          superseded_at?: string | null
          support_needed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avkk_competence_avkk_subject_id_fkey"
            columns: ["avkk_subject_id"]
            isOneToOne: false
            referencedRelation: "avkk_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_competence_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_competence_rating_value_id_fkey"
            columns: ["rating_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
        ]
      }
      avkk_consequence: {
        Row: {
          area_key_snapshot: string
          area_label_snapshot: string
          area_value_id: string
          avkk_subject_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          schedule_impact_key_snapshot: string
          schedule_impact_label_snapshot: string
          schedule_impact_value_id: string
          severity_key_snapshot: string
          severity_label_snapshot: string
          severity_value_id: string
          superseded_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_key_snapshot: string
          area_label_snapshot: string
          area_value_id: string
          avkk_subject_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          schedule_impact_key_snapshot: string
          schedule_impact_label_snapshot: string
          schedule_impact_value_id: string
          severity_key_snapshot: string
          severity_label_snapshot: string
          severity_value_id: string
          superseded_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_key_snapshot?: string
          area_label_snapshot?: string
          area_value_id?: string
          avkk_subject_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          schedule_impact_key_snapshot?: string
          schedule_impact_label_snapshot?: string
          schedule_impact_value_id?: string
          severity_key_snapshot?: string
          severity_label_snapshot?: string
          severity_value_id?: string
          superseded_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avkk_consequence_area_value_id_fkey"
            columns: ["area_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_consequence_avkk_subject_id_fkey"
            columns: ["avkk_subject_id"]
            isOneToOne: false
            referencedRelation: "avkk_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_consequence_schedule_impact_value_id_fkey"
            columns: ["schedule_impact_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_consequence_severity_value_id_fkey"
            columns: ["severity_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
        ]
      }
      avkk_responsibility: {
        Row: {
          avkk_subject_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          person_id: string
          role_key_snapshot: string
          role_label_snapshot: string
          role_value_id: string
          updated_at: string
          updated_by: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          avkk_subject_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          person_id: string
          role_key_snapshot: string
          role_label_snapshot: string
          role_value_id: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          avkk_subject_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          person_id?: string
          role_key_snapshot?: string
          role_label_snapshot?: string
          role_value_id?: string
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avkk_responsibility_avkk_subject_id_fkey"
            columns: ["avkk_subject_id"]
            isOneToOne: false
            referencedRelation: "avkk_subject"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_responsibility_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_responsibility_role_value_id_fkey"
            columns: ["role_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
        ]
      }
      avkk_responsibility_type: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          responsibility_id: string
          type_key_snapshot: string
          type_label_snapshot: string
          type_value_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          responsibility_id: string
          type_key_snapshot: string
          type_label_snapshot: string
          type_value_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          responsibility_id?: string
          type_key_snapshot?: string
          type_label_snapshot?: string
          type_value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avkk_responsibility_type_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "avkk_responsibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avkk_responsibility_type_type_value_id_fkey"
            columns: ["type_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
        ]
      }
      avkk_subject: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          status: string
          subject_id: string
          subject_title_snapshot: string
          subject_type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          subject_id: string
          subject_title_snapshot?: string
          subject_type: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          subject_id?: string
          subject_title_snapshot?: string
          subject_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      customer: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          systemhouse_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          systemhouse_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          systemhouse_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_systemhouse_fk"
            columns: ["systemhouse_id"]
            isOneToOne: false
            referencedRelation: "systemhouse"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_access: {
        Row: {
          access_level: string
          created_at: string
          customer_id: string
          id: string
          status: string
          systemhouse_id: string
          updated_at: string
          user_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          access_level: string
          created_at?: string
          customer_id: string
          id?: string
          status?: string
          systemhouse_id: string
          updated_at?: string
          user_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          customer_id?: string
          id?: string
          status?: string
          systemhouse_id?: string
          updated_at?: string
          user_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_customer_fk"
            columns: ["customer_id", "systemhouse_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id", "systemhouse_id"]
          },
          {
            foreignKeyName: "customer_access_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          first_name: string
          id: string
          last_name: string
          mfa_enabled: boolean
          phone: string
          profile_image: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          mfa_enabled?: boolean
          phone?: string
          profile_image?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          mfa_enabled?: boolean
          phone?: string
          profile_image?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reference_catalog: {
        Row: {
          created_at: string
          description: string
          domain: string
          id: string
          is_hierarchical: boolean
          is_system: boolean
          key: string
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string
          domain: string
          id?: string
          is_hierarchical?: boolean
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string
          domain?: string
          id?: string
          is_hierarchical?: boolean
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      reference_value: {
        Row: {
          attributes: Json
          catalog_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          is_default: boolean
          key: string
          label: string
          parent_value_id: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          attributes?: Json
          catalog_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          key: string
          label: string
          parent_value_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          attributes?: Json
          catalog_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          key?: string
          label?: string
          parent_value_id?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_value_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "reference_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_value_parent_value_id_fkey"
            columns: ["parent_value_id"]
            isOneToOne: false
            referencedRelation: "reference_value"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_value_history: {
        Row: {
          catalog_id: string
          changed_at: string
          changed_by: string | null
          id: string
          operation: string
          snapshot: Json
          value_id: string
        }
        Insert: {
          catalog_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          operation: string
          snapshot: Json
          value_id: string
        }
        Update: {
          catalog_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          operation?: string
          snapshot?: Json
          value_id?: string
        }
        Relationships: []
      }
      systemhouse: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      systemhouse_membership: {
        Row: {
          created_at: string
          id: string
          status: string
          systemhouse_id: string
          updated_at: string
          user_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          systemhouse_id: string
          updated_at?: string
          user_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          systemhouse_id?: string
          updated_at?: string
          user_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "systemhouse_membership_systemhouse_fk"
            columns: ["systemhouse_id"]
            isOneToOne: false
            referencedRelation: "systemhouse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systemhouse_membership_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
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
      avkk_can_write: { Args: { _subject: string }; Returns: boolean }
      avkk_people_directory: {
        Args: never
        Returns: {
          display_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      has_active_systemhouse_membership: {
        Args: { _systemhouse_id: string; _user_id: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_customer_access: {
        Args: {
          _customer_id: string
          _required_level: string
          _systemhouse_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "systemadministrator"
        | "administrator"
        | "teamlead"
        | "projectmanager"
        | "engineer"
        | "customer"
        | "viewer"
      user_status: "active" | "inactive" | "locked" | "archived"
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
      app_role: [
        "systemadministrator",
        "administrator",
        "teamlead",
        "projectmanager",
        "engineer",
        "customer",
        "viewer",
      ],
      user_status: ["active", "inactive", "locked", "archived"],
    },
  },
} as const
