import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminClient } from "@/components/admin-client"
import { hasAccess, type UserRole } from "@/lib/roles"

export default async function AdminUsuariosPage() {
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

  if (!hasAccess(userRole, "/dashboard/admin/usuarios")) {
    redirect("/dashboard/admin")
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Usuarios y roles</h1>
        <p className="text-muted-foreground leading-relaxed">
          Gestionar roles y permisos de los usuarios
        </p>
      </div>
      <AdminClient initialProfiles={profiles ?? []} currentUserId={user.id} />
    </div>
  )
}
