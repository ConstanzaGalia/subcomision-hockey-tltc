import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ParcelasClient } from "@/components/parcelas-client"
import { hasAccess, type UserRole } from "@/lib/roles"

export default async function ParcelasPage() {
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

  if (!hasAccess(userRole, "/dashboard/parcelas")) {
    redirect("/dashboard")
  }

  const { data: ventas, error: ventasError } = await supabase
    .from("parcelas_ventas")
    .select("*")
    .order("created_at", { ascending: false })

  if (ventasError) {
    // Si falla, mostramos lista vacía pero evitamos romper el render
    console.error("Error cargando parcelas_ventas:", ventasError.message)
  }

  const ventaIds = (ventas ?? []).map((v) => v.id).filter(Boolean)
  const { data: asignaciones, error: asigError } = ventaIds.length
    ? await supabase
        .from("parcelas_asignaciones")
        .select("venta_id, parcela_numero")
        .in("venta_id", ventaIds)
    : { data: [], error: null }

  if (asigError) {
    console.error("Error cargando parcelas_asignaciones:", asigError.message)
  }

  const asigByVenta = new Map<string, { parcela_numero: number }[]>()
  for (const a of asignaciones ?? []) {
    const list = asigByVenta.get(a.venta_id) ?? []
    list.push({ parcela_numero: Number(a.parcela_numero) })
    asigByVenta.set(a.venta_id, list)
  }

  const ventasEnriquecidas = (ventas ?? []).map((v) => ({
    ...v,
    parcelas_asignaciones: asigByVenta.get(v.id) ?? [],
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Venta de Parcelas</h1>
        <p className="text-muted-foreground leading-relaxed">
          Gestion de ventas de parcelas para la cancha de hockey
        </p>
      </div>
      <ParcelasClient initialVentas={ventasEnriquecidas as any} />
    </div>
  )
}
