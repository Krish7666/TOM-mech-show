import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// Same env vars the app already used (see .env — never read/modified by tooling).
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

// null when env vars are missing, rather than throwing at import time — lets
// the app boot and show a clear inline error instead of a blank white screen.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

// ─── SHARED ADMIN CONSTANTS ───────────────────────────────────────────────────
// Same client-side admin-flag scheme the TOM showcase has used throughout.
export const ADMIN_KEY      = "tom_admin_token";
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
