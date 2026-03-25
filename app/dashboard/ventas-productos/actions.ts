"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"

export type VentasProductosActionResult = { ok: true } | { ok: false; error: string }

function canManage(role: UserRole): boolean {
  return hasAccess(role, "/dashboard/ventas-productos")
}

export async function updateProducto(
  productoId: string,
  data: {
    nombre: string
    descripcion: string | null
    precio: number
    moneda: "ARS" | "USD"
    activo: boolean
  }
): Promise<VentasProductosActionResult> {
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
  if (!canManage(userRole)) {
    return { ok: false, error: "No tenés permiso para editar productos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("productos")
      .update({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() ? data.descripcion.trim() : null,
        precio: data.precio,
        moneda: data.moneda,
        activo: data.activo,
      })
      .eq("id", productoId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteProducto(productoId: string): Promise<VentasProductosActionResult> {
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
  if (!canManage(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar productos" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("productos").delete().eq("id", productoId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}

export async function updateProductoVenta(
  ventaId: string,
  data: {
    producto_id: string
    cantidad: number
    precio_unitario: number
    total: number
    fecha: string
    metodo_pago: "EFECTIVO" | "TRANSFERENCIA"
    ubicacion_id: string
  }
): Promise<VentasProductosActionResult> {
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
  if (!canManage(userRole)) {
    return { ok: false, error: "No tenés permiso para editar ventas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("producto_ventas")
      .update({
        producto_id: data.producto_id,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario,
        total: data.total,
        fecha: data.fecha,
        metodo_pago: data.metodo_pago,
        ubicacion_id: data.ubicacion_id,
      })
      .eq("id", ventaId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar"
    return { ok: false, error: message }
  }
}

export async function deleteProductoVenta(ventaId: string): Promise<VentasProductosActionResult> {
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
  if (!canManage(userRole)) {
    return { ok: false, error: "No tenés permiso para eliminar ventas" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("producto_ventas").delete().eq("id", ventaId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar"
    return { ok: false, error: message }
  }
}
