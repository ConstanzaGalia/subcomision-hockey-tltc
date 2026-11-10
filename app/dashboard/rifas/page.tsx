import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/roles"
import { hasAccess } from "@/lib/roles"
import {
  RifasClient,
  type RifaCampanaRow,
  type RifaPagoRow,
  type RifaRow,
} from "@/components/rifas-client"
import { defaultUbicacionId, type UbicacionOption } from "@/lib/ubicaciones"

export default async function RifasPage() {
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

  if (!hasAccess(userRole, "/dashboard/rifas")) {
    redirect("/dashboard")
  }

  const { data: ubicacionesRaw } = await supabase
    .from("ubicaciones")
    .select("id, nombre, orden")
    .eq("activo", true)
    .order("orden", { ascending: true, nullsFirst: false })
    .order("nombre", { ascending: true })

  const ubicaciones: UbicacionOption[] = (ubicacionesRaw ?? []) as UbicacionOption[]
  const ubicacionDefaultId = defaultUbicacionId(ubicaciones)

  const { data: campanasRaw, error: campanasError } = await supabase
    .from("rifas_campanas")
    .select("*")
    .order("created_at", { ascending: false })

  if (campanasError) {
    console.error("Error cargando rifas_campanas:", campanasError.message)
  }

  const campanas: RifaCampanaRow[] = ((campanasRaw ?? []) as Array<{
    id: string
    nombre: string
    descripcion: string | null
    activa: boolean
    cuenta_para_cancha: boolean
    created_at: string
    user_id: string
  }>).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    activa: c.activa,
    cuenta_para_cancha: c.cuenta_para_cancha ?? true,
    created_at: c.created_at,
    user_id: c.user_id,
  }))

  const { data: rifasRaw, error: rifasError } = await supabase
    .from("rifas")
    .select("*, ubicaciones(nombre), rifas_pagos(id, monto, fecha, nota, created_at)")
    .order("created_at", { ascending: false })

  if (rifasError) {
    console.error("Error cargando rifas:", rifasError.message)
  }

  const rifas: RifaRow[] = ((rifasRaw ?? []) as Array<{
    id: string
    campana_id: string
    nombre_apellido: string
    cantidad: number
    entregado: boolean
    moneda: "ARS" | "USD"
    ubicacion_id: string
    fecha: string
    created_at: string
    user_id: string
    ubicaciones?: { nombre: string } | null
    rifas_pagos?: RifaPagoRow[] | null
  }>).map((r) => {
    const pagos = (r.rifas_pagos ?? []).slice().sort((a, b) => {
      const byFecha = (b.fecha ?? "").localeCompare(a.fecha ?? "")
      if (byFecha !== 0) return byFecha
      return (b.created_at ?? "").localeCompare(a.created_at ?? "")
    })
    const rendimiento = pagos.reduce((sum, p) => sum + Number(p.monto ?? 0), 0)
    return {
      id: r.id,
      campana_id: r.campana_id,
      nombre_apellido: r.nombre_apellido,
      cantidad: r.cantidad,
      entregado: r.entregado,
      moneda: r.moneda,
      ubicacion_id: r.ubicacion_id,
      ubicacion_nombre: r.ubicaciones?.nombre ?? null,
      fecha: r.fecha,
      created_at: r.created_at,
      user_id: r.user_id,
      pagos,
      rendimiento,
    }
  })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Rifas</h1>
        <p className="text-muted-foreground leading-relaxed">
          Creá cada rifa (por ejemplo la del auto), asigná números por persona, marcá entregas y
          registrá el rendimiento. Por defecto suma a la cancha.
        </p>
      </div>
      <RifasClient
        initialCampanas={campanas}
        initialRifas={rifas}
        ubicaciones={ubicaciones}
        defaultUbicacionId={ubicacionDefaultId}
      />
    </div>
  )
}
