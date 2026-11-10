"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type RifasActionResult = { ok: true } | { ok: false; error: string }

function canManageRifas(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/rifas")
}

async function requireRifasManager(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
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
  if (!canManageRifas(userRole)) {
    return { ok: false, error: "No tenés permiso para gestionar rifas" }
  }
  return { ok: true, userId: user.id }
}

export async function updateRifaCampana(
  campanaId: string,
  data: {
    nombre: string
    descripcion: string | null
    activa: boolean
    cuenta_para_cancha: boolean
  }
): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("rifas_campanas")
      .update({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() ? data.descripcion.trim() : null,
        activa: data.activa,
        cuenta_para_cancha: data.cuenta_para_cancha,
      })
      .eq("id", campanaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la rifa"
    return { ok: false, error: message }
  }
}

export async function deleteRifaCampana(campanaId: string): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("rifas_campanas").delete().eq("id", campanaId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar la rifa"
    return { ok: false, error: message }
  }
}

export async function updateRifa(
  rifaId: string,
  data: {
    nombre_apellido: string
    cantidad: number
    moneda: "ARS" | "USD"
    entregado: boolean
    ubicacion_id: string
    fecha: string
    campana_id: string
  }
): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("rifas")
      .update({
        nombre_apellido: data.nombre_apellido.trim(),
        cantidad: data.cantidad,
        moneda: data.moneda,
        entregado: data.entregado,
        ubicacion_id: data.ubicacion_id,
        fecha: data.fecha,
        campana_id: data.campana_id,
      })
      .eq("id", rifaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function toggleRifaEntregado(
  rifaId: string,
  entregado: boolean
): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("rifas").update({ entregado }).eq("id", rifaId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteRifa(rifaId: string): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("rifas").delete().eq("id", rifaId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}

export async function deleteRifaPago(pagoId: string): Promise<RifasActionResult> {
  const auth = await requireRifasManager()
  if (!auth.ok) return auth

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("rifas_pagos").delete().eq("id", pagoId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar el pago"
    return { ok: false, error: message }
  }
}
