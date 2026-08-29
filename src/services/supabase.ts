import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createPreviewClient, isPreviewMode } from "./preview";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// VITE_UI_PREVIEW=true sustituye el cliente por un stub con datos de
// ejemplo, para maquetar las pantallas de detrás del login sin backend.
// Ver services/preview.ts.
if (!isPreviewMode && (!url || !key)) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local",
  );
}

export const supabase = (
  isPreviewMode
    ? createPreviewClient()
    : createClient<Database>(url, key)
) as SupabaseClient<Database>;
