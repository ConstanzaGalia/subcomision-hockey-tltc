"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type ObjetivoResult = { ok: true } | { ok: false; error: string }

function canEditObjetivo(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/parcelas") || hasAccess(role, "/dashboard/prestamos")
}

export async function updateObjetivoCancha(montoUsd: number): Promise<ObjetivoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autorizado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  const userRole = (profile?.role as UserRole) ?? "ENTRENADOR"
  if (!canEditObjetivo(userRole)) {
    return { ok: false, error: "No tenés permiso para editar el objetivo" }
  }

  if (montoUsd < 0) return { ok: false, error: "El monto no puede ser negativo" }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("objetivo_cancha")
      .update({ monto_usd: montoUsd, updated_at: new Date().toISOString() })
      .eq("id", "default")

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}
