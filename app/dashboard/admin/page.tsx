import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, Users } from "lucide-react"
import { hasAccess, type UserRole } from "@/lib/roles"

export default async function AdminHubPage() {
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

  if (!hasAccess(userRole, "/dashboard/admin")) {
    redirect("/dashboard")
  }

  const canUsuarios = hasAccess(userRole, "/dashboard/admin/usuarios")

  const sections: {
    href: string
    label: string
    description: string
    icon: typeof Users
  }[] = [
    {
      href: "/dashboard/admin/jugadoras",
      label: "Jugadoras",
      description: "Plantel, divisiones por edad y bloques por nivel",
      icon: Users,
    },
  ]

  if (canUsuarios) {
    sections.push({
      href: "/dashboard/admin/usuarios",
      label: "Usuarios y roles",
      description: "Gestionar roles y permisos de los usuarios",
      icon: ShieldCheck,
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-muted-foreground leading-relaxed">
          Jugadoras, divisiones y usuarios del sistema
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {sections.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="transition-shadow hover:shadow-md hover:border-primary/30">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
