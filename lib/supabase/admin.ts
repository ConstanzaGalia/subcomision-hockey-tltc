import { createClient } from "@supabase/supabase-js"

/**
 * Cliente de Supabase con service_role. Solo usar en el servidor (Server Actions, API routes).
 * Bypasea RLS. Usar únicamente después de verificar permisos (ej. usuario es ADMIN o SUBCOMISION).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, serviceRoleKey)
}
