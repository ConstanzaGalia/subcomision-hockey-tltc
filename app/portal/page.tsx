import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDni } from "@/lib/categorias"
import { AvanceCampana } from "@/components/landing/avance-campana"
import { PortalCuotaEstadoClient } from "@/components/portal-cuota-estado-client"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
        <AvanceCampana campana={campana} />
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6 sm:px-6">
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
    const campana = asOne(
      r.rifas_campanas as
        | { nombre: string; precio_unitario: number | null }
        | { nombre: string; precio_unitario: number | null }[]
        | null,
    )
    const pagos = (r.rifas_pagos as { monto: number }[] | null | undefined) ?? []
    const pagado = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0)
    const precio = campana?.precio_unitario != null ? Number(campana.precio_unitario) : null
    const esperado =
      precio != null && Number.isFinite(precio)
        ? precio * (Number(r.cantidad) || 0)
        : null
    const deuda =
      esperado != null ? Math.max(0, esperado - pagado) : null
    return {
      id: r.id,
      campanaNombre: campana?.nombre ?? "Rifa",
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

  return (
    <div className="flex flex-col">
      <AvanceCampana campana={campana} />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi cuenta</h1>
        <p className="text-muted-foreground leading-relaxed">
          Pagos registrados a tu nombre y deuda de rifas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Nombre</p>
            <p className="font-medium text-foreground">
              {jugadora.apellido}, {jugadora.nombre}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">DNI</p>
            <p className="font-medium text-foreground">{formatDni(String(jugadora.dni))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">División</p>
            <p className="font-medium text-foreground">{divisionNombre}</p>
          </div>
        </CardContent>
      </Card>

      {hayDeudaCalculable ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pagado en rifas</CardDescription>
              <CardTitle className="text-2xl">
                {totalPagadoRifas.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Deuda de rifas</CardDescription>
              <CardTitle className="text-2xl">
                {totalDeudaRifas.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Deuda de rifas</h2>
          <p className="text-sm text-muted-foreground">
            Se calcula cuando la campaña tiene precio por rifa: cantidad × precio − pagos.
          </p>
        </div>
        {rifas.filter((r) => r.esperado != null).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay deuda calculable (sin asignaciones con precio de campaña).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Falta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rifas
                  .filter((r) => r.esperado != null)
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.campanaNombre}</TableCell>
                      <TableCell>{r.cantidad}</TableCell>
                      <TableCell>{moneyLabel(r.moneda, r.esperado ?? 0)}</TableCell>
                      <TableCell>{moneyLabel(r.moneda, r.pagado)}</TableCell>
                      <TableCell>{moneyLabel(r.moneda, r.deuda ?? 0)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rifas (historial)</h2>
          <p className="text-sm text-muted-foreground">Asignaciones y pagos registrados.</p>
        </div>
        {(rifas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin rifas vinculadas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Pagado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rifas.map((r) => (
                  <TableRow key={`h-${r.id}`}>
                    <TableCell>{formatFecha(r.fecha)}</TableCell>
                    <TableCell>{r.campanaNombre}</TableCell>
                    <TableCell>{r.cantidad}</TableCell>
                    <TableCell>{moneyLabel(r.moneda, r.pagado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Cuota extraordinaria</h2>
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
        <p className="text-sm text-muted-foreground">Historial de lo pagado a tu nombre.</p>
        {(cuotas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pagos de cuota vinculados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cuotas ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatFecha(c.fecha)}</TableCell>
                    <TableCell>{c.metodo_pago}</TableCell>
                    <TableCell>{moneyLabel(c.moneda, Number(c.monto))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <PortalCuotaEstadoClient rows={cuotaEstado} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Parcelas</h2>
          <p className="text-sm text-muted-foreground">Historial de ventas vinculadas.</p>
        </div>
        {(parcelas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin parcelas vinculadas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(parcelas ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {formatFecha(String(p.created_at).slice(0, 10))}
                    </TableCell>
                    <TableCell>USD {Number(p.precio).toLocaleString("es-AR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
