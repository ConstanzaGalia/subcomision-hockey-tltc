import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import { BalanceClient, type BalanceMovimiento } from "@/components/balance-client"
import { defaultUbicacionId, type UbicacionOption } from "@/lib/ubicaciones"

export default async function BalancePage() {
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
  if (!hasAccess(userRole, "/dashboard/balance")) {
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

  const { data: movimientos } = await supabase
    .from("balance_movimientos")
    .select("*, ubicaciones(nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Balance de cuenta</h1>
        <p className="text-muted-foreground leading-relaxed">
          Registrá ingresos y gastos, separados por moneda (ARS / USD).
        </p>
      </div>
      <BalanceClient
        initialMovimientos={(movimientos ?? []).map((m) => {
          const row = m as Record<string, unknown> & { id: string }
          const ub = row.ubicaciones as { nombre: string } | null | undefined
          return {
            ...row,
            ubicacion_nombre: ub?.nombre ?? null,
          }
        }) as BalanceMovimiento[]}
        ubicaciones={ubicaciones}
        defaultUbicacionId={ubicacionDefaultId}
      />
    </div>
  )
}

