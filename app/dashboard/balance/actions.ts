"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type BalanceActionResult = { ok: true } | { ok: false; error: string }

function canManageBalance(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/balance")
}

export type BalanceMovimientoUpdate = {
  tipo: "INGRESO" | "GASTO"
  moneda: "ARS" | "USD"
  monto: number
  descripcion: string | null
  fecha: string // YYYY-MM-DD
}

export async function updateBalanceMovimiento(
  movimientoId: string,
  data: BalanceMovimientoUpdate
): Promise<BalanceActionResult> {
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
  if (!canManageBalance(userRole)) {
    return { ok: false, error: "No tenés permiso para editar el balance" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("balance_movimientos")
      .update({
        tipo: data.tipo,
        moneda: data.moneda,
        monto: data.monto,
        descripcion: data.descripcion?.trim() ? data.descripcion.trim() : null,
        fecha: data.fecha,
      })
      .eq("id", movimientoId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteBalanceMovimiento(movimientoId: string): Promise<BalanceActionResult> {
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
  if (!canManageBalance(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar movimientos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("balance_movimientos").delete().eq("id", movimientoId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}

