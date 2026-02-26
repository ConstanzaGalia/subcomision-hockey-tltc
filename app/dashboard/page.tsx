import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LandPlot, DollarSign, Users, ShieldCheck } from "lucide-react"
import { hasAccess, type UserRole } from "@/lib/roles"

export default async function DashboardPage() {
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

  const canSeeParcelas = hasAccess(userRole, "/dashboard/parcelas")
  const canSeeAdmin = hasAccess(userRole, "/dashboard/admin")

  let totalVentas = 0
  let totalRecaudado = 0
  if (canSeeParcelas) {
    const { data: ventas } = await supabase
      .from("parcelas_ventas")
      .select("id, precio")
    totalVentas = ventas?.length ?? 0
    totalRecaudado = ventas?.reduce((sum, v) => sum + Number(v.precio), 0) ?? 0
  }

  const sections: { href: string; label: string; description: string; icon: typeof LandPlot }[] = []
  if (canSeeParcelas) {
    sections.push({
      href: "/dashboard/parcelas",
      label: "Venta de Parcelas",
      description: "Registrar ventas y descargar recibos",
      icon: LandPlot,
    })
  }
  if (canSeeAdmin) {
    sections.push({
      href: "/dashboard/admin",
      label: "Administracion",
      description: "Gestionar usuarios y roles",
      icon: ShieldCheck,
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground text-balance">Panel de Administracion</h1>
        <p className="text-muted-foreground leading-relaxed">
          Bienvenido al panel de la Sub Comision de Hockey
        </p>
      </div>

      {/* Quick Stats: solo parcelas si tiene acceso */}
      {canSeeParcelas && (
        <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recaudado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                USD {totalRecaudado.toLocaleString("es-AR")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">En venta de parcelas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parcelas Vendidas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalVentas}</div>
              <p className="mt-1 text-xs text-muted-foreground">Ventas registradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secciones: solo las que el rol puede ver */}
      {sections.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Secciones</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {sections.map(({ href, label, description, icon: Icon }) => (
              <Link key={href} href={href} className="group">
                <Card className="transition-shadow hover:shadow-md hover:border-primary/30">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {label}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {sections.length === 0 && (
        <p className="text-muted-foreground">
          No tenes acceso a ninguna seccion adicional. Contacta a un administrador si necesitas permisos.
        </p>
      )}
    </div>
  )
}
