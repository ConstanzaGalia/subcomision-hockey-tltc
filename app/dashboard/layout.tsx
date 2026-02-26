import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import type { UserRole } from "@/lib/roles"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile with role and name
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nombre, apellido")
    .eq("id", user.id)
    .single()

  const userRole: UserRole = (profile?.role as UserRole) ?? "ENTRENADOR"
  const userName = ([profile?.nombre, profile?.apellido].filter(Boolean).join(" ").trim() || user.email) ?? ""

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <DashboardSidebar userName={userName} userRole={userRole} />
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  )
}
