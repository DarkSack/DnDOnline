import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createPreviewClient } from "./preview";

// El proyecto de Supabase ya no existe; las pantallas antiguas (personajes,
// salas, tablero, combate) solo se ven con VITE_UI_PREVIEW=true y datos de ejemplo.
// shortcut: stub en vez de backend real, hasta migrar esas pantallas al servidor propio.
export const supabase = createPreviewClient() as unknown as SupabaseClient<Database>;
