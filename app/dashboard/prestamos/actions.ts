"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type PrestamosActionResult = { ok: true } | { ok: false; error: string }

function canManagePrestamos(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/prestamos")
}

export async function updatePrestamo(
  prestamoId: string,
  data: { nombre_apellido: string; monto: number }
): Promise<PrestamosActionResult> {
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
  if (!canManagePrestamos(userRole)) {
    return { ok: false, error: "No tenés permiso para editar préstamos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("prestamos")
      .update({
        nombre_apellido: data.nombre_apellido.trim(),
        monto: data.monto,
      })
      .eq("id", prestamoId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function toggleDevuelto(
  prestamoId: string,
  devuelto: boolean
): Promise<PrestamosActionResult> {
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
  if (!canManagePrestamos(userRole)) {
    return { ok: false, error: "No tenés permiso para modificar préstamos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("prestamos")
      .update({ devuelto })
      .eq("id", prestamoId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deletePrestamo(prestamoId: string): Promise<PrestamosActionResult> {
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
  if (!canManagePrestamos(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar préstamos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("prestamos").delete().eq("id", prestamoId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}
