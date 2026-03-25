"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type CuotaExtraordinariaActionResult = { ok: true } | { ok: false; error: string }

function canManageCuotas(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/cuota-extraordinaria")
}

export async function updateCuotaExtraordinaria(
  cuotaId: string,
  data: {
    nombre_apellido: string
    moneda: "USD" | "ARS"
    metodo_pago: "EFECTIVO" | "TRANSFERENCIA"
    monto: number
    fecha: string
    ubicacion_id: string
  }
): Promise<CuotaExtraordinariaActionResult> {
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
  if (!canManageCuotas(userRole)) {
    return { ok: false, error: "No tenés permiso para editar cuotas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("cuota_extraordinaria")
      .update({
        nombre_apellido: data.nombre_apellido.trim(),
        moneda: data.moneda,
        metodo_pago: data.metodo_pago,
        monto: data.monto,
        fecha: data.fecha,
        ubicacion_id: data.ubicacion_id,
      })
      .eq("id", cuotaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteCuotaExtraordinaria(cuotaId: string): Promise<CuotaExtraordinariaActionResult> {
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
  if (!canManageCuotas(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar cuotas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("cuota_extraordinaria").delete().eq("id", cuotaId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}

export async function markReciboGenerated(cuotaId: string): Promise<CuotaExtraordinariaActionResult> {
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
  if (!canManageCuotas(userRole)) {
    return { ok: false, error: "No tenés permiso para generar recibos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("cuota_extraordinaria")
      .update({
        recibo_generado_por: user.id,
        recibo_generado_en: new Date().toISOString(),
      })
      .eq("id", cuotaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar el recibo"
    return { ok: false, error: message }
  }
}

