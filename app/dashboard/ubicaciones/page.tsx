import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import { defaultUbicacionId, type UbicacionOption } from "@/lib/ubicaciones"
import {
  UbicacionesClient,
  type MovimientoUbicacionRow,
  type TotalPorUbicacionRow,
} from "@/components/ubicaciones-client"

export default async function UbicacionesPage() {
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

  if (!hasAccess(userRole, "/dashboard/ubicaciones")) {
    redirect("/dashboard")
  }

  const { data: ubicacionesRaw, error: ubError } = await supabase
    .from("ubicaciones")
    .select("id, nombre, orden")
    .eq("activo", true)
    .order("orden", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true })

  if (ubError) {
    console.error("ubicaciones:", ubError.message)
  }

  const ubicaciones: UbicacionOption[] = (ubicacionesRaw ?? []) as UbicacionOption[]
  const initialUbicacionId = defaultUbicacionId(ubicaciones)

  const { data: totalesRaw, error: totError } = await supabase.rpc("totales_por_ubicacion")
  if (totError) {
    console.error("totales_por_ubicacion:", totError.message)
  }

  const totales: TotalPorUbicacionRow[] = (totalesRaw ?? []) as TotalPorUbicacionRow[]

  let initialMovimientos: MovimientoUbicacionRow[] = []
  if (initialUbicacionId) {
    const { data: movs, error: movError } = await supabase.rpc("list_movimientos_por_ubicacion", {
      p_ubicacion_id: initialUbicacionId,
    })
    if (movError) {
      console.error("list_movimientos_por_ubicacion:", movError.message)
    } else {
      initialMovimientos = (movs ?? []) as MovimientoUbicacionRow[]
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ubicaciones del dinero</h1>
        <p className="text-muted-foreground leading-relaxed">
          Consultá en qué cuenta o persona está imputado cada movimiento y los totales por moneda.
        </p>
      </div>
      {ubicaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay ubicaciones cargadas. Ejecutá en Supabase el script 013_ubicaciones.sql de la carpeta scripts del
          proyecto.
        </p>
      ) : (
        <UbicacionesClient
          ubicaciones={ubicaciones}
          totales={totales}
          initialUbicacionId={initialUbicacionId}
          initialMovimientos={initialMovimientos}
        />
      )}
    </div>
  )
}
