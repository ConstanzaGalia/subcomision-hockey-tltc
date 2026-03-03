import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import { PrestamosClient } from "@/components/prestamos-client"

export default async function PrestamosPage() {
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

  if (!hasAccess(userRole, "/dashboard/prestamos")) {
    redirect("/dashboard")
  }

  const { data: prestamos } = await supabase
    .from("prestamos")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Prestamos</h1>
        <p className="text-muted-foreground leading-relaxed">
          Gestion de prestamos de la Sub Comision de Hockey
        </p>
      </div>
      <PrestamosClient initialPrestamos={prestamos ?? []} />
    </div>
  )
}
