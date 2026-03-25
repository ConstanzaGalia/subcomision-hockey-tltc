import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { LandPlot, ShieldCheck, Banknote, Scale, Package } from "lucide-react"
import { hasAccess, type UserRole } from "@/lib/roles"
import { DashboardStats } from "@/components/dashboard-stats"

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
  const canSeePrestamos = hasAccess(userRole, "/dashboard/prestamos")
  const canSeeCuotaExtraordinaria = hasAccess(userRole, "/dashboard/cuota-extraordinaria")
  const canSeeVentasProductos = hasAccess(userRole, "/dashboard/ventas-productos")
  const canSeeBalance = hasAccess(userRole, "/dashboard/balance")
  const canSeeAdmin = hasAccess(userRole, "/dashboard/admin")

  let totalParcelas = 0
  let totalPrestamos = 0
  if (canSeeParcelas) {
    const { data: ventas } = await supabase
      .from("parcelas_ventas")
      .select("id, precio")
    totalParcelas = ventas?.reduce((sum, v) => sum + Number(v.precio), 0) ?? 0
  }
  if (canSeePrestamos) {
    const { data: prestamos } = await supabase
      .from("prestamos")
      .select("monto")
    totalPrestamos = prestamos?.reduce((sum, p) => sum + Number(p.monto), 0) ?? 0
  }
  const totalRecaudadoCancha = totalParcelas + totalPrestamos

  let objetivoMonto = 0
  try {
    const { data: objetivo } = await supabase
      .from("objetivo_cancha")
      .select("monto_usd")
      .eq("id", "default")
      .single()
    if (objetivo?.monto_usd != null) objetivoMonto = Number(objetivo.monto_usd)
  } catch {
    // Tabla objetivo_cancha puede no existir aún
  }

  const canEditObjetivo = canSeeParcelas || canSeePrestamos

  const sections: { href: string; label: string; description: string; icon: typeof LandPlot }[] = []
  if (canSeeParcelas) {
    sections.push({
      href: "/dashboard/parcelas",
      label: "Venta de Parcelas",
      description: "Registrar ventas y descargar recibos",
      icon: LandPlot,
    })
  }
  if (canSeeCuotaExtraordinaria) {
    sections.push({
      href: "/dashboard/cuota-extraordinaria",
      label: "Cuota Extraordinaria",
      description: "Registrar cuotas y descargar recibos",
      icon: Banknote,
    })
  }
  if (canSeePrestamos) {
    sections.push({
      href: "/dashboard/prestamos",
      label: "Prestamos",
      description: "Gestion de prestamos",
      icon: Banknote,
    })
  }
  if (canSeeVentasProductos) {
    sections.push({
      href: "/dashboard/ventas-productos",
      label: "Ventas y productos",
      description: "Cargar productos y registrar ventas",
      icon: Package,
    })
  }
  if (canSeeBalance) {
    sections.push({
      href: "/dashboard/balance",
      label: "Balance de cuenta",
      description: "Ingresos y gastos en ARS y USD",
      icon: Scale,
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

      {/* Quick Stats: total recaudado y objetivo (solo visible para quien tiene acceso a parcelas o préstamos) */}
      {(canSeeParcelas || canSeePrestamos) && (
        <DashboardStats
          totalRecaudadoCancha={totalRecaudadoCancha}
          objetivoMonto={objetivoMonto}
          canEditObjetivo={canEditObjetivo}
        />
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
