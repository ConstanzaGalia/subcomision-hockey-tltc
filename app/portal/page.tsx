import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDni } from "@/lib/categorias"
import { AvanceCampana } from "@/components/landing/avance-campana"
import { PortalCuotaEstadoClient } from "@/components/portal-cuota-estado-client"
import { PortalNav } from "@/components/portal-nav"
import { loadCampanaPublica } from "@/lib/campana-publica-server"
import { labelEstadoCuota, type PortalCuotaEstadoRow } from "@/lib/portal-cuota-estado"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
function formatFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-")
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}/${y}`
}

function moneyLabel(moneda: string, monto: number): string {
  const prefix = moneda === "ARS" ? "ARS" : "USD"
  return `${prefix} ${Number(monto).toLocaleString("es-AR")}`
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: jugadora } = await supabase
    .from("jugadoras")
    .select("id, nombre, apellido, dni, division_id, divisiones(nombre)")
    .eq("cuenta_user_id", user.id)
    .maybeSingle()

  if (!jugadora) {
    const campana = await loadCampanaPublica()
    return (
      <div className="flex flex-col">
        <PortalNav links={[{ href: "#avance", label: "Avance" }, { href: "#cuenta", label: "Cuenta" }]} />
        <AvanceCampana campana={campana} compact />
        <div id="cuenta" className="mx-auto w-full max-w-5xl scroll-mt-14 space-y-3 px-3 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-foreground">Mi cuenta</h1>
          <p className="text-muted-foreground leading-relaxed">
            Tu usuario está activo, pero todavía no está vinculado a una ficha de jugadora.
            Pedile a la subcomisión que sincronice las cuentas.
          </p>
        </div>
      </div>
    )
  }

  const jugadoraId = jugadora.id
  const divisionNombre =
    asOne(jugadora.divisiones as { nombre: string } | { nombre: string }[] | null)?.nombre ??
    "—"

  const [
    campana,
    { data: cuotas },
    { data: parcelas },
    { data: rifasRaw },
    { data: cuotaEstadoRaw, error: cuotaEstadoError },
  ] = await Promise.all([
    loadCampanaPublica(),
    supabase
      .from("cuota_extraordinaria")
      .select("id, nombre_apellido, moneda, metodo_pago, monto, fecha")
      .eq("jugadora_id", jugadoraId)
      .order("fecha", { ascending: false }),
    supabase
      .from("parcelas_ventas")
      .select("id, nombre_apellido, precio, created_at")
      .eq("jugadora_id", jugadoraId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rifas")
      .select(
        "id, nombre_apellido, cantidad, moneda, fecha, campana_id, rifas_campanas(nombre, precio_unitario), rifas_pagos(monto)",
      )
      .eq("jugadora_id", jugadoraId)
      .order("fecha", { ascending: false }),
    supabase.rpc("get_portal_cuota_estado"),
  ])

  if (cuotaEstadoError) {
    console.error("Error get_portal_cuota_estado:", cuotaEstadoError.message)
  }

  const cuotaEstado: PortalCuotaEstadoRow[] = ((cuotaEstadoRaw ?? []) as Array<{
    jugadora_id: string
    apellido: string
    nombre: string
    dni: string
    division_id: string
    division_nombre: string
    bloque_id: string | null
    bloque_nombre: string | null
    pago: boolean
    pagos_count: number | string
    ultima_fecha: string | null
  }>).map((r) => ({
    jugadora_id: r.jugadora_id,
    apellido: r.apellido,
    nombre: r.nombre,
    dni: String(r.dni ?? ""),
    division_id: r.division_id,
    division_nombre: r.division_nombre,
    bloque_id: r.bloque_id,
    bloque_nombre: r.bloque_nombre,
    pago: Boolean(r.pago),
    pagos_count: Number(r.pagos_count) || 0,
    ultima_fecha: r.ultima_fecha,
  }))

  const rifas = (rifasRaw ?? []).map((r) => {
    const campanaRifa = asOne(
      r.rifas_campanas as
        | { nombre: string; precio_unitario: number | null }
        | { nombre: string; precio_unitario: number | null }[]
        | null,
    )
    const pagos = (r.rifas_pagos as { monto: number }[] | null | undefined) ?? []
    const pagado = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0)
    const precio = campanaRifa?.precio_unitario != null ? Number(campanaRifa.precio_unitario) : null
    const esperado =
      precio != null && Number.isFinite(precio)
        ? precio * (Number(r.cantidad) || 0)
        : null
    const deuda =
      esperado != null ? Math.max(0, esperado - pagado) : null
    return {
      id: r.id,
      campanaNombre: campanaRifa?.nombre ?? "Rifa",
      cantidad: Number(r.cantidad) || 0,
      moneda: r.moneda as string,
      fecha: r.fecha as string,
      pagado,
      esperado,
      deuda,
      precio,
    }
  })

  const totalPagadoRifas = rifas.reduce((s, r) => s + r.pagado, 0)
  const totalDeudaRifas = rifas.reduce((s, r) => s + (r.deuda ?? 0), 0)
  const hayDeudaCalculable = rifas.some((r) => r.deuda != null)
  const pagoCuotaPropia = (cuotas ?? []).length > 0
  const rifasConDeuda = rifas.filter((r) => r.esperado != null)

  return (
    <div className="flex flex-col">
      <PortalNav />
      <AvanceCampana campana={campana} compact />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-6 sm:gap-10 sm:px-6">
        <section id="cuenta" className="scroll-mt-14 space-y-3">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Mi cuenta</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tus datos, pagos y el estado de la cuota del plantel.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos personales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <p className="text-muted-foreground">Nombre</p>
                <p className="text-right font-medium text-foreground">
                  {jugadora.apellido}, {jugadora.nombre}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <p className="text-muted-foreground">DNI</p>
                <p className="font-medium text-foreground">{formatDni(String(jugadora.dni))}</p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-muted-foreground">División</p>
                <p className="font-medium text-foreground">{divisionNombre}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        <section id="rifas" className="scroll-mt-14 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Rifas</h2>
            <p className="text-sm text-muted-foreground">
              Deuda e historial a tu nombre.
            </p>
          </div>

          {hayDeudaCalculable ? (
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardDescription>Pagado</CardDescription>
                  <CardTitle className="text-xl tabular-nums sm:text-2xl">
                    {totalPagadoRifas.toLocaleString("es-AR")}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                  <CardDescription>Deuda</CardDescription>
                  <CardTitle className="text-xl tabular-nums sm:text-2xl">
                    {totalDeudaRifas.toLocaleString("es-AR")}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deuda por campaña</CardTitle>
              <CardDescription>
                Cantidad × precio − pagos (si la campaña tiene precio).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rifasConDeuda.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin deuda calculable todavía.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {rifasConDeuda.map((r) => (
                    <li key={r.id} className="space-y-1 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground">{r.campanaNombre}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          Falta {moneyLabel(r.moneda, r.deuda ?? 0)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.cantidad} rifas · esperado {moneyLabel(r.moneda, r.esperado ?? 0)} ·
                        pagado {moneyLabel(r.moneda, r.pagado)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              {rifas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin rifas vinculadas.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {rifas.map((r) => (
                    <li
                      key={`h-${r.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{r.campanaNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFecha(r.fecha)} · {r.cantidad} rifas
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {moneyLabel(r.moneda, r.pagado)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        <section id="cuota" className="scroll-mt-14 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Mi cuota</h2>
            <Badge
              variant="secondary"
              className={
                pagoCuotaPropia
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              }
            >
              {labelEstadoCuota(pagoCuotaPropia)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Lo pagado a tu nombre.</p>

          <Card>
            <CardContent className="pt-4">
              {(cuotas ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin pagos de cuota vinculados.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {(cuotas ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-3 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{formatFecha(c.fecha)}</p>
                        <p className="text-xs text-muted-foreground">{c.metodo_pago}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {moneyLabel(c.moneda, Number(c.monto))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        <section id="plantel-cuota" className="scroll-mt-14">
          <PortalCuotaEstadoClient rows={cuotaEstado} />
        </section>

        <hr className="border-border" />

        <section id="parcelas" className="scroll-mt-14 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Parcelas</h2>
            <p className="text-sm text-muted-foreground">Ventas vinculadas a tu nombre.</p>
          </div>
          <Card>
            <CardContent className="pt-4">
              {(parcelas ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin parcelas vinculadas.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {(parcelas ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-3"
                    >
                      <p className="text-sm text-muted-foreground">
                        {formatFecha(String(p.created_at).slice(0, 10))}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        USD {Number(p.precio).toLocaleString("es-AR")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
