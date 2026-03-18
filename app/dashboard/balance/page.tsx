import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import { BalanceClient, type BalanceMovimiento } from "@/components/balance-client"

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

  const { data: movimientos } = await supabase
    .from("balance_movimientos")
    .select("*")
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
      <BalanceClient initialMovimientos={(movimientos ?? []) as BalanceMovimiento[]} />
    </div>
  )
}

