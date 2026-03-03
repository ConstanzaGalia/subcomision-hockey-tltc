"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type ParcelasActionResult = { ok: true } | { ok: false; error: string }

function canManageParcelas(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/parcelas")
}

export async function updateParcelaVenta(
  ventaId: string,
  data: { nombre_apellido: string; precio: number }
): Promise<ParcelasActionResult> {
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
  if (!canManageParcelas(userRole)) {
    return { ok: false, error: "No tenés permiso para editar ventas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("parcelas_ventas")
      .update({
        nombre_apellido: data.nombre_apellido.trim(),
        precio: data.precio,
      })
      .eq("id", ventaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function toggleAnotadaEnCancha(
  ventaId: string,
  anotada_en_cancha: boolean
): Promise<ParcelasActionResult> {
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
  if (!canManageParcelas(userRole)) {
    return { ok: false, error: "No tenés permiso para modificar ventas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("parcelas_ventas")
      .update({ anotada_en_cancha })
      .eq("id", ventaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteParcelaVenta(ventaId: string): Promise<ParcelasActionResult> {
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
  if (!canManageParcelas(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar ventas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("parcelas_ventas").delete().eq("id", ventaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}
