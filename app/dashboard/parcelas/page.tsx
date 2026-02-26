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

  const { data: ventas } = await supabase
    .from("parcelas_ventas")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Venta de Parcelas</h1>
        <p className="text-muted-foreground leading-relaxed">
          Gestion de ventas de parcelas para la cancha de hockey
        </p>
      </div>
      <ParcelasClient initialVentas={ventas ?? []} />
    </div>
  )
}
