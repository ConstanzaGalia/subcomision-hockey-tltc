import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/roles"
import { hasAccess } from "@/lib/roles"
import { CuotaExtraordinariaClient } from "@/components/cuota-extraordinaria-client"
import { defaultUbicacionId, type UbicacionOption } from "@/lib/ubicaciones"

export default async function CuotaExtraordinariaPage() {
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

  if (!hasAccess(userRole, "/dashboard/cuota-extraordinaria")) {
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

  const { data: cuotas, error: cuotasError } = await supabase
    .from("cuota_extraordinaria")
    .select("*, ubicaciones(nombre)")
    .order("created_at", { ascending: false })

  if (cuotasError) {
    console.error("Error cargando cuota_extraordinaria:", cuotasError.message)
  }

  const cuotaRows = (cuotas ?? []) as Array<{
    id: string
    nombre_apellido: string
    moneda: "USD" | "ARS"
    metodo_pago: "EFECTIVO" | "TRANSFERENCIA"
    monto: number
    fecha: string
    created_at: string
    user_id: string
    ubicacion_id: string
    ubicaciones?: { nombre: string } | null
    recibo_generado_por?: string | null
  }>

  const generatorIds = cuotaRows.map((c) => c.recibo_generado_por).filter(Boolean) as string[]
  const { data: profiles } = generatorIds.length
    ? await supabase.from("profiles").select("id, nombre, apellido").in("id", generatorIds)
    : { data: [] }

  const profileById = new Map<string, string>()
  for (const p of profiles ?? []) {
    const name = [p.nombre, p.apellido].filter(Boolean).join(" ").trim()
    if (p.id && name) profileById.set(p.id, name)
  }

  const cuotasEnriquecidas = cuotaRows.map((c) => ({
    ...c,
    ubicacion_nombre: c.ubicaciones?.nombre ?? null,
    recibo_generado_por_nombre_apellido: c.recibo_generado_por ? profileById.get(c.recibo_generado_por) ?? null : null,
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Cuota Extraordinaria</h1>
        <p className="text-muted-foreground leading-relaxed">
          Registrá cuotas extraordinarias en USD o ARS y descargá sus recibos en PDF.
        </p>
      </div>
      <CuotaExtraordinariaClient
        initialCuotas={cuotasEnriquecidas as any}
        ubicaciones={ubicaciones}
        defaultUbicacionId={ubicacionDefaultId}
      />
    </div>
  )
}

