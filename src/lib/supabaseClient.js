import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  "https://omicqnxpmfbltqrkbfid.supabase.co";

const rawAnon =
  import.meta.env.VITE_SUPABASE_ANON ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_QXTksvwnKp5s3eaXeGCcIw_3-oLJSif";

const SUPABASE_URL = typeof rawUrl === "string" ? rawUrl.trim().replace(/['";]+$/g, "").replace(/^['"]+/g, "") : "";
const SUPABASE_ANON = typeof rawAnon === "string" ? rawAnon.trim().replace(/['";]+$/g, "").replace(/^['"]+/g, "") : "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

// ─── SHARED ADMIN CONSTANTS ───────────────────────────────────────────────────
export const ADMIN_SESSION_KEY = "tom-admin-session";
export const ADMIN_USERNAME = "admin";
// SHA-256 hash of the administrative password (no plaintext stored)
export const ADMIN_PASSWORD_HASH = "bf91df79a0c1db76d19817bf00d30631981b7d11bfb85a821e6527e62542c801";

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminCredentials(username, password) {
  if (!username || !password) return false;
  if (username.trim().toLowerCase() !== ADMIN_USERNAME) return false;
  const hash = await sha256Hex(password);
  return hash === ADMIN_PASSWORD_HASH;
}
