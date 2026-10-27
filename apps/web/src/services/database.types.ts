export type RoomRole = "dm" | "player";
export type EntityKindDb = "pc" | "npc" | "monster";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          sheet: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          sheet?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          sheet?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          dm_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dm_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          dm_id?: string;
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          join_code: string;
          active: boolean;
          created_at: string;
          active_map_id: string | null;
          fog: unknown;
          walls: unknown;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          join_code?: string;
          active?: boolean;
          created_at?: string;
          active_map_id?: string | null;
          fog?: unknown;
          walls?: unknown;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          join_code?: string;
          active?: boolean;
          active_map_id?: string | null;
          fog?: unknown;
          walls?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_active_map_id_fkey";
            columns: ["active_map_id"];
            isOneToOne: false;
            referencedRelation: "maps";
            referencedColumns: ["id"];
          },
        ];
      };
      maps: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          background_path: string | null;
          cols: number;
          rows: number;
          cell_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          background_path?: string | null;
          cols?: number;
          rows?: number;
          cell_size?: number;
        };
        Update: {
          name?: string;
          background_path?: string | null;
          cols?: number;
          rows?: number;
          cell_size?: number;
        };
        Relationships: [
          {
            foreignKeyName: "maps_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: RoomRole;
          character_id: string | null;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role: RoomRole;
          character_id?: string | null;
          joined_at?: string;
        };
        Update: {
          role?: RoomRole;
          character_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_members_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      combats: {
        Row: {
          id: string;
          room_id: string;
          active: boolean;
          round: number;
          current_turn_idx: number;
          combatants: unknown;
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          active?: boolean;
          round?: number;
          current_turn_idx?: number;
          combatants?: unknown;
          ended_at?: string | null;
        };
        Update: {
          active?: boolean;
          round?: number;
          current_turn_idx?: number;
          combatants?: unknown;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "combats_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_messages: {
        Row: {
          id: string;
          room_id: string;
          actor_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          actor_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_messages_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      dice_rolls: {
        Row: {
          id: string;
          room_id: string;
          actor_id: string;
          formula: string;
          results: unknown;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          actor_id: string;
          formula: string;
          results: unknown;
          total: number;
          created_at?: string;
        };
        Update: {
          formula?: string;
          results?: unknown;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dice_rolls_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dice_rolls_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entities: {
        Row: {
          id: string;
          room_id: string;
          kind: EntityKindDb;
          name: string;
          col: number;
          row: number;
          size: number;
          hp: number | null;
          hp_max: number | null;
          visible: boolean;
          character_id: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          kind: EntityKindDb;
          name: string;
          col?: number;
          row?: number;
          size?: number;
          hp?: number | null;
          hp_max?: number | null;
          visible?: boolean;
          character_id?: string | null;
          color?: string | null;
        };
        Update: {
          kind?: EntityKindDb;
          name?: string;
          col?: number;
          row?: number;
          size?: number;
          hp?: number | null;
          hp_max?: number | null;
          visible?: boolean;
          character_id?: string | null;
          color?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entities_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entities_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_room: {
        Args: { code: string };
        Returns: Database["public"]["Tables"]["rooms"]["Row"];
      };
      roll_dice: {
        Args: {
          p_room_id: string;
          p_formula: string;
          p_dice: unknown;
          p_modifier?: number;
        };
        Returns: Database["public"]["Tables"]["dice_rolls"]["Row"];
      };
      start_combat: {
        Args: {
          p_room_id: string;
          p_participants: unknown;
        };
        Returns: Database["public"]["Tables"]["combats"]["Row"];
      };
    };
    Enums: {
      room_role: RoomRole;
    };
  };
};
