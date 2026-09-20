import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  "";

const rawAnon =
  import.meta.env.VITE_SUPABASE_ANON ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  "";

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

/**
 * Verifies admin credentials via three paths:
 *   1. Supabase Auth (Email / Password) if an email is provided and Supabase is configured.
 *   2. VITE_ADMIN_PASSWORD env var — allows overriding via deployment config.
 *   3. SHA-256 hash comparison against the stored hash constant.
 *
 * Returns an object: { success: boolean, authMode: "supabase" | "local", error?: string }
 */
export async function verifyAdminCredentials(usernameOrEmail, password) {
  if (!usernameOrEmail || !password) return { success: false };
  const identifier = usernameOrEmail.trim();

  // 1. Supabase Auth if email format
  if (supabase && identifier.includes("@")) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });
      if (!error && data?.session) {
        return { success: true, authMode: "supabase", user: data.user };
      }
      if (error) {
        return { success: false, error: error.message };
      }
    } catch {
      // If network fails, proceed to local check if username happens to match
    }
  }

  // 2. Local / fallback admin username check
  if (identifier.toLowerCase() === ADMIN_USERNAME) {
    // NOTE: VITE_ADMIN_PASSWORD removed — env vars prefixed with VITE_ are
    // embedded in the public JS bundle and expose the password to anyone.

    const hash = await sha256Hex(password);
    if (hash === ADMIN_PASSWORD_HASH) {
      return { success: true, authMode: "local" };
    }
  }

  return { success: false, error: "Invalid administrator credentials." };
}

/**
 * Cleanly signs out from Supabase Auth and clears the local session flag.
 */
export async function adminSignOut() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
}


