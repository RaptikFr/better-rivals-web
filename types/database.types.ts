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
      follows: {
        Row: {
          created_at: string
          followed_player_id: string
          follower_player_id: string
        }
        Insert: {
          created_at?: string
          followed_player_id: string
          follower_player_id: string
        }
        Update: {
          created_at?: string
          followed_player_id?: string
          follower_player_id?: string
        }
        Relationships: []
      }
      objectifs: {
        Row: {
          achieved_at: string | null
          car_class: string
          car_ordinal: number
          created_at: string
          drivetrain: string
          id: string
          player_id: string
          target_player_id: string
          track_id: number
        }
        Insert: {
          achieved_at?: string | null
          car_class: string
          car_ordinal: number
          created_at?: string
          drivetrain: string
          id?: string
          player_id: string
          target_player_id: string
          track_id: number
        }
        Update: {
          achieved_at?: string | null
          car_class?: string
          car_ordinal?: number
          created_at?: string
          drivetrain?: string
          id?: string
          player_id?: string
          target_player_id?: string
          track_id?: number
        }
        Relationships: []
      }
      cars: {
        Row: {
          add_ons: string | null
          car_ordinal: number | null
          car_type: string | null
          collection: string | null
          id: number
          initial_class: string | null
          manufacturer: string
          name: string
          year: number
        }
        Insert: {
          add_ons?: string | null
          car_ordinal?: number | null
          car_type?: string | null
          collection?: string | null
          id?: never
          initial_class?: string | null
          manufacturer: string
          name: string
          year: number
        }
        Update: {
          add_ons?: string | null
          car_ordinal?: number | null
          car_type?: string | null
          collection?: string | null
          id?: never
          initial_class?: string | null
          manufacturer?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          gamertag: string
          id: string
          message: string
          status: string | null
          sujet: string
        }
        Insert: {
          created_at?: string | null
          email: string
          gamertag: string
          id?: string
          message: string
          status?: string | null
          sujet: string
        }
        Update: {
          created_at?: string | null
          email?: string
          gamertag?: string
          id?: string
          message?: string
          status?: string | null
          sujet?: string
        }
        Relationships: []
      }
      lap_times: {
        Row: {
          car_class: string
          car_ordinal: number
          car_pi: number
          created_at: string
          drivetrain: string
          id: string
          is_sprint: boolean | null
          num_cylinders: number | null
          player_id: string
          previous_time_ms: number | null
          recorded_at: string
          setup_author: string | null
          share_code: string | null
          time_ms: number
          track_id: number
          verified: boolean
        }
        Insert: {
          car_class: string
          car_ordinal: number
          car_pi: number
          created_at?: string
          drivetrain: string
          id?: string
          is_sprint?: boolean | null
          num_cylinders?: number | null
          player_id: string
          previous_time_ms?: number | null
          recorded_at?: string
          setup_author?: string | null
          share_code?: string | null
          time_ms: number
          track_id: number
          verified?: boolean
        }
        Update: {
          car_class?: string
          car_ordinal?: number
          car_pi?: number
          created_at?: string
          drivetrain?: string
          id?: string
          is_sprint?: boolean | null
          num_cylinders?: number | null
          player_id?: string
          previous_time_ms?: number | null
          recorded_at?: string
          setup_author?: string | null
          share_code?: string | null
          time_ms?: number
          track_id?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lap_times_car_ordinal_fkey"
            columns: ["car_ordinal"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["car_ordinal"]
          },
          {
            foreignKeyName: "lap_times_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lap_times_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      lap_times_history: {
        Row: {
          car_class: string
          car_ordinal: number
          car_pi: number | null
          drivetrain: string
          id: string
          player_id: string
          recorded_at: string
          time_ms: number
          track_id: number
        }
        Insert: {
          car_class: string
          car_ordinal: number
          car_pi?: number | null
          drivetrain: string
          id?: string
          player_id: string
          recorded_at?: string
          time_ms: number
          track_id: number
        }
        Update: {
          car_class?: string
          car_ordinal?: number
          car_pi?: number | null
          drivetrain?: string
          id?: string
          player_id?: string
          recorded_at?: string
          time_ms?: number
          track_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "lap_times_history_car_ordinal_fkey"
            columns: ["car_ordinal"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["car_ordinal"]
          },
          {
            foreignKeyName: "lap_times_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lap_times_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          link: string | null
          message: string
          player_id: string | null
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          id?: never
          link?: string | null
          message: string
          player_id?: string | null
          read?: boolean
          type?: string
        }
        Update: {
          created_at?: string
          id?: never
          link?: string | null
          message?: string
          player_id?: string | null
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          discord_tag: string | null
          discord_tag_public: string | null
          email_notifications_enabled: boolean
          hide_discord_tag: boolean
          id: string
          notify_class: boolean
          notify_drivetrain: boolean
          notify_exact: boolean
          notify_rival: boolean
          notify_weekly: boolean
          preferences: Json
          pseudo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discord_tag?: string | null
          email_notifications_enabled?: boolean
          hide_discord_tag?: boolean
          id?: string
          notify_class?: boolean
          notify_drivetrain?: boolean
          notify_exact?: boolean
          notify_rival?: boolean
          notify_weekly?: boolean
          preferences?: Json
          pseudo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discord_tag?: string | null
          email_notifications_enabled?: boolean
          hide_discord_tag?: boolean
          id?: string
          notify_class?: boolean
          notify_drivetrain?: boolean
          notify_exact?: boolean
          notify_rival?: boolean
          notify_weekly?: boolean
          preferences?: Json
          pseudo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          lap_time_id: string
          raison: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          lap_time_id: string
          raison: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          lap_time_id?: string
          raison?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_lap_time_id_fkey"
            columns: ["lap_time_id"]
            isOneToOne: false
            referencedRelation: "lap_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          description: string | null
          event_lab_code: string | null
          id: number
          is_official: boolean
          is_sprint: boolean
          length_km: number | null
          name: string
          status: string
          submitted_by: string | null
          type: string
        }
        Insert: {
          description?: string | null
          event_lab_code?: string | null
          id?: number
          is_official?: boolean
          is_sprint?: boolean
          length_km?: number | null
          name: string
          status?: string
          submitted_by?: string | null
          type: string
        }
        Update: {
          description?: string | null
          event_lab_code?: string | null
          id?: number
          is_official?: boolean
          is_sprint?: boolean
          length_km?: number | null
          name?: string
          status?: string
          submitted_by?: string | null
          type?: string
        }
        Relationships: []
      }
      tune_setups: {
        Row: {
          car_ordinal: number
          id: string
          is_original: boolean
          label: string | null
          player_id: string
          share_code: string
          track_id: number | null
          track_type: string | null
          updated_at: string | null
        }
        Insert: {
          car_ordinal: number
          id?: string
          is_original?: boolean
          label?: string | null
          player_id: string
          share_code: string
          track_id?: number | null
          track_type?: string | null
          updated_at?: string | null
        }
        Update: {
          car_ordinal?: number
          id?: string
          is_original?: boolean
          label?: string | null
          player_id?: string
          share_code?: string
          track_id?: number | null
          track_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tune_setups_car_ordinal_fkey"
            columns: ["car_ordinal"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["car_ordinal"]
          },
          {
            foreignKeyName: "tune_setups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tune_setups_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          track_id: number
          user_id: string
          vote: boolean
        }
        Insert: {
          created_at?: string | null
          id?: string
          track_id: number
          user_id: string
          vote: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          track_id?: number
          user_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      world_records: {
        Row: {
          car_class: string
          created_at: string | null
          id: number
          time_ms: number
          track_id: number | null
          updated_at: string | null
        }
        Insert: {
          car_class: string
          created_at?: string | null
          id?: never
          time_ms: number
          track_id?: number | null
          updated_at?: string | null
        }
        Update: {
          car_class?: string
          created_at?: string | null
          id?: never
          time_ms?: number
          track_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_records_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_config: {
        Row: {
          car_class: string
          car_ordinal: number
          created_at: string
          drivetrain: string
          ends_at: string
          id: string
          starts_at: string
          track_id: number
        }
        Insert: {
          car_class: string
          car_ordinal: number
          created_at?: string
          drivetrain: string
          ends_at: string
          id?: string
          starts_at?: string
          track_id: number
        }
        Update: {
          car_class?: string
          car_ordinal?: number
          created_at?: string
          drivetrain?: string
          ends_at?: string
          id?: string
          starts_at?: string
          track_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_config_car_ordinal_fkey"
            columns: ["car_ordinal"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["car_ordinal"]
          },
          {
            foreignKeyName: "weekly_config_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      player_config_rankings: {
        Args: { p_player_id: string }
        Returns: {
          track_id: number
          car_ordinal: number
          car_class: string
          drivetrain: string
          time_ms: number
          rank: number
          total: number
          ahead_pseudo: string | null
          ahead_gap_ms: number | null
          behind_pseudo: string | null
          behind_gap_ms: number | null
        }[]
      }
      my_discord_tag: {
        Args: Record<string, never>
        Returns: string
      }
      general_ranking: {
        Args: Record<string, never>
        Returns: {
          player_id: string
          pseudo: string
          discord_tag: string | null
          points: number
          gold: number
          silver: number
          bronze: number
          configs: number
        }[]
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
    Enums: {},
  },
} as const
