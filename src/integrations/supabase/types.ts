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
      boat_coownership_vaults: {
        Row: {
          boat_id: string
          created_at: string
          id: string
          is_active: boolean
          mint_address: string
          total_shares: number
          updated_at: string
          vault_pda: string
          voting_threshold: number
        }
        Insert: {
          boat_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          mint_address: string
          total_shares?: number
          updated_at?: string
          vault_pda: string
          voting_threshold?: number
        }
        Update: {
          boat_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          mint_address?: string
          total_shares?: number
          updated_at?: string
          vault_pda?: string
          voting_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "boat_coownership_vaults_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: true
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
        ]
      }
      boats: {
        Row: {
          boat_type: string
          created_at: string
          description: string
          id: string
          length_feet: number
          manufacturer: string
          mint_address: string | null
          name: string
          registration_number: string
          transaction_signature: string | null
          updated_at: string
          wallet_address: string
          year_built: number
        }
        Insert: {
          boat_type: string
          created_at?: string
          description: string
          id?: string
          length_feet: number
          manufacturer: string
          mint_address?: string | null
          name: string
          registration_number: string
          transaction_signature?: string | null
          updated_at?: string
          wallet_address: string
          year_built: number
        }
        Update: {
          boat_type?: string
          created_at?: string
          description?: string
          id?: string
          length_feet?: number
          manufacturer?: string
          mint_address?: string | null
          name?: string
          registration_number?: string
          transaction_signature?: string | null
          updated_at?: string
          wallet_address?: string
          year_built?: number
        }
        Relationships: [
          {
            foreignKeyName: "boats_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      coownership_proposals: {
        Row: {
          created_at: string
          executed_at: string | null
          expires_at: string | null
          id: string
          proposal_data: Json
          proposal_type: string
          proposer_wallet: string
          status: string
          vault_id: string
        }
        Insert: {
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          proposal_data: Json
          proposal_type: string
          proposer_wallet: string
          status?: string
          vault_id: string
        }
        Update: {
          created_at?: string
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          proposal_data?: Json
          proposal_type?: string
          proposer_wallet?: string
          status?: string
          vault_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coownership_proposals_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "boat_coownership_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      coownership_shares: {
        Row: {
          created_at: string
          id: string
          share_percentage: number
          updated_at: string
          vault_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_percentage: number
          updated_at?: string
          vault_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          share_percentage?: number
          updated_at?: string
          vault_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "coownership_shares_vault_id_fkey"
            columns: ["vault_id"]
            isOneToOne: false
            referencedRelation: "boat_coownership_vaults"
            referencedColumns: ["id"]
          },
        ]
      }
      coownership_votes: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          share_percentage: number
          vote: boolean
          voter_wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          share_percentage: number
          vote: boolean
          voter_wallet: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          share_percentage?: number
          vote?: boolean
          voter_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "coownership_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "coownership_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          interested_trip_types: string[] | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          interested_trip_types?: string[] | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          interested_trip_types?: string[] | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      trip_companions: {
        Row: {
          companion_wallet_address: string
          created_at: string
          id: string
          trip_id: string
        }
        Insert: {
          companion_wallet_address: string
          created_at?: string
          id?: string
          trip_id: string
        }
        Update: {
          companion_wallet_address?: string
          created_at?: string
          id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_companions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          message: string
          sender_wallet_address: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          message: string
          sender_wallet_address: string
          trip_id: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          message?: string
          sender_wallet_address?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_offers: {
        Row: {
          boat_id: string | null
          created_at: string
          date_from: string
          date_to: string
          description: string
          id: string
          max_crew: number | null
          place: string
          planner: string
          public_visibility: boolean
          title: string
          trip_type: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          boat_id?: string | null
          created_at?: string
          date_from: string
          date_to: string
          description: string
          id?: string
          max_crew?: number | null
          place: string
          planner: string
          public_visibility?: boolean
          title: string
          trip_type: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          boat_id?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          description?: string
          id?: string
          max_crew?: number | null
          place?: string
          planner?: string
          public_visibility?: boolean
          title?: string
          trip_type?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_offers_boat_id_fkey"
            columns: ["boat_id"]
            isOneToOne: false
            referencedRelation: "boats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_offers_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
