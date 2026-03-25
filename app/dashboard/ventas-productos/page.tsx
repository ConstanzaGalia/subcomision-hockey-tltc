import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/roles"
import { hasAccess } from "@/lib/roles"
import { VentasProductosClient, type VentaProductoRow } from "@/components/ventas-productos-client"
import { defaultUbicacionId, type UbicacionOption } from "@/lib/ubicaciones"

export default async function VentasProductosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const userRole = (profile?.role as UserRole) ?? "ENTRENADOR"

  if (!hasAccess(userRole, "/dashboard/ventas-productos")) {
    redirect("/dashboard")
  }

  const { data: productos, error: prodError } = await supabase
    .from("productos")
    .select("*")
    .order("nombre", { ascending: true })

  if (prodError) {
    console.error("Error cargando productos:", prodError.message)
  }

  const { data: ubicacionesRaw } = await supabase
    .from("ubicaciones")
    .select("id, nombre, orden")
    .eq("activo", true)
    .order("orden", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true })

  const ubicaciones: UbicacionOption[] = (ubicacionesRaw ?? []) as UbicacionOption[]
  const ubicacionDefaultId = defaultUbicacionId(ubicaciones)

  const { data: ventasRaw, error: ventasError } = await supabase
    .from("producto_ventas")
    .select("*, productos(nombre, moneda), ubicaciones(nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })

  if (ventasError) {
    console.error("Error cargando producto_ventas:", ventasError.message)
  }

  type VentaRow = {
    id: string
    producto_id: string
    cantidad: number
    precio_unitario: number
    total: number
    fecha: string
    metodo_pago?: "EFECTIVO" | "TRANSFERENCIA"
    user_id: string
    created_at: string
    ubicacion_id: string
    productos: { nombre: string; moneda: string } | null
    ubicaciones?: { nombre: string } | null
  }

  const ventasEnriquecidas: VentaProductoRow[] = ((ventasRaw ?? []) as VentaRow[]).map((v) => ({
    id: v.id,
    producto_id: v.producto_id,
    cantidad: v.cantidad,
    precio_unitario: v.precio_unitario,
    total: v.total,
    fecha: v.fecha,
    metodo_pago: v.metodo_pago ?? "EFECTIVO",
    user_id: v.user_id,
    created_at: v.created_at,
    ubicacion_id: v.ubicacion_id,
    ubicacion_nombre: v.ubicaciones?.nombre ?? null,
    producto_nombre: v.productos?.nombre ?? "—",
    producto_moneda: (v.productos?.moneda as VentaProductoRow["producto_moneda"]) ?? null,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ventas y productos</h1>
        <p className="text-muted-foreground leading-relaxed">
          Cargá el catálogo de productos y registrá cada venta con cantidad y fecha.
        </p>
      </div>
      <VentasProductosClient
        initialProductos={productos ?? []}
        initialVentas={ventasEnriquecidas}
        ubicaciones={ubicaciones}
        defaultUbicacionId={ubicacionDefaultId}
      />
    </div>
  )
}
