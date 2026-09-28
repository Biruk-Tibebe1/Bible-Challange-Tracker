export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship<
  ForeignKeyName extends string,
  Columns extends string[],
  ReferencedRelation extends string,
  ReferencedColumns extends string[],
> = {
  foreignKeyName: ForeignKeyName;
  columns: Columns;
  isOneToOne: false;
  referencedRelation: ReferencedRelation;
  referencedColumns: ReferencedColumns;
};

type Table<Row, Insert, Update, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; created_at: string },
        { id: string; created_at?: string },
        { id?: string; created_at?: string }
      >;
      challenges: Table<
        {
          id: string;
          owner_id: string;
          name: string;
          challenge_type: "predefined" | "custom";
          start_book_id: string;
          start_chapter: number;
          end_book_id: string;
          end_chapter: number;
          total_days: number;
          challenge_key: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          owner_id: string;
          name: string;
          challenge_type: "predefined" | "custom";
          start_book_id: string;
          start_chapter: number;
          end_book_id: string;
          end_chapter: number;
          total_days: number;
          challenge_key?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          owner_id?: string;
          name?: string;
          challenge_type?: "predefined" | "custom";
          start_book_id?: string;
          start_chapter?: number;
          end_book_id?: string;
          end_chapter?: number;
          total_days?: number;
          challenge_key?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      challenge_days: Table<
        {
          id: string;
          challenge_id: string;
          day_number: number;
          chapters: Json;
          ethiopian_year: number | null;
          ethiopian_month: string | null;
          ethiopian_day: number | null;
          created_at: string;
        },
        {
          id?: string;
          challenge_id: string;
          day_number: number;
          chapters?: Json;
          ethiopian_year?: number | null;
          ethiopian_month?: string | null;
          ethiopian_day?: number | null;
          created_at?: string;
        },
        {
          id?: string;
          challenge_id?: string;
          day_number?: number;
          chapters?: Json;
          ethiopian_year?: number | null;
          ethiopian_month?: string | null;
          ethiopian_day?: number | null;
          created_at?: string;
        },
        [Relationship<"challenge_days_challenge_id_fkey", ["challenge_id"], "challenges", ["id"]>]
      >;
      user_challenge_progress: Table<
        {
          id: string;
          user_id: string;
          challenge_id: string;
          day_number: number;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          challenge_id: string;
          day_number: number;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          day_number?: number;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        [
          Relationship<"user_challenge_progress_challenge_fk", ["challenge_id"], "challenges", ["id"]>,
          Relationship<
            "user_challenge_progress_schedule_day_fk",
            ["challenge_id", "day_number"],
            "challenge_days",
            ["challenge_id", "day_number"]
          >,
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_challenge_with_days: {
        Args: {
          p_name: string;
          p_challenge_type: "predefined" | "custom";
          p_start_book_id: string;
          p_start_chapter: number;
          p_end_book_id: string;
          p_end_chapter: number;
          p_total_days: number;
          p_days: Json;
          p_challenge_key?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}