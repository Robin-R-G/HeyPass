/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal Supabase Database types — using `any` for all rows to avoid
// `{ [key: string]: Json }` strictness issues while still providing
// table names for autocomplete. Replace with generated types via
// `supabase gen types typescript` when ready.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
};

type GenericView = {
  Row: Record<string, any>;
};

type GenericFunction = {
  Args: Record<string, any>;
  Returns: any;
};

export interface Database {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericView>;
    Functions: Record<string, GenericFunction>;
  };
}
