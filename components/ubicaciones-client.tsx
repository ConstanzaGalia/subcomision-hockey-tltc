"use client"

import { useCallback, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { fuenteMovimientoLabel, type UbicacionOption } from "@/lib/ubicaciones"
import { toast } from "sonner"

export type TotalPorUbicacionRow = {
  ubicacion_id: string
  orden: number | null
  nombre: string
  total_ars: number
  total_usd: number
}

export type MovimientoUbicacionRow = {
  fuente: string
  fecha: string
  moneda: string
  monto: number
  detalle: string
  origen_id: string
}

function formatFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-")
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}/${y}`
}

function moneySigned(moneda: string, monto: number): string {
  const prefix = moneda === "ARS" ? "ARS" : "USD"
  const n = Number(monto)
  const abs = Math.abs(n).toLocaleString("es-AR")
  if (n < 0) return `-${prefix} ${abs}`
  return `${prefix} ${abs}`
}

export function UbicacionesClient({
  ubicaciones,
  totales,
  initialUbicacionId,
  initialMovimientos,
}: {
  ubicaciones: UbicacionOption[]
  totales: TotalPorUbicacionRow[]
  initialUbicacionId: string
  initialMovimientos: MovimientoUbicacionRow[]
}) {
  const [selectedId, setSelectedId] = useState(initialUbicacionId)
  const [movimientos, setMovimientos] = useState<MovimientoUbicacionRow[]>(initialMovimientos)
  const [loading, setLoading] = useState(false)

  const totalesById = useMemo(() => {
    const m = new Map<string, TotalPorUbicacionRow>()
    for (const t of totales) m.set(t.ubicacion_id, t)
    return m
  }, [totales])

  const loadMovimientos = useCallback(async (ubicacionId: string) => {
    if (!ubicacionId) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc("list_movimientos_por_ubicacion", {
      p_ubicacion_id: ubicacionId,
    })
    if (error) {
      toast.error("No se pudo cargar el detalle", { description: error.message })
      setLoading(false)
      return
    }
    setMovimientos((data ?? []) as MovimientoUbicacionRow[])
    setLoading(false)
  }, [])

  async function onUbicacionChange(id: string) {
    setSelectedId(id)
    await loadMovimientos(id)
  }

  const resumenSeleccion = useMemo(() => {
    let ars = 0
    let usd = 0
    for (const r of movimientos) {
      const v = Number(r.monto) || 0
      if (r.moneda === "ARS") ars += v
      if (r.moneda === "USD") usd += v
    }
    return { ars, usd }
  }, [movimientos])

  const subtotalesPorFuente = useMemo(() => {
    type Key = string
    const map = new Map<Key, { fuente: string; ars: number; usd: number }>()
    for (const r of movimientos) {
      const k = r.fuente
      if (!map.has(k)) map.set(k, { fuente: k, ars: 0, usd: 0 })
      const e = map.get(k)!
      const v = Number(r.monto) || 0
      if (r.moneda === "ARS") e.ars += v
      if (r.moneda === "USD") e.usd += v
    }
    return [...map.values()].sort((a, b) => a.fuente.localeCompare(b.fuente))
  }, [movimientos])

  const selectedNombre = ubicaciones.find((u) => u.id === selectedId)?.nombre ?? "—"

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Totales por ubicación</h2>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          Suma de parcelas (USD), cuotas, préstamos, ventas de productos y movimientos de balance (ingresos menos
          gastos), separado por moneda.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {totales.map((t) => (
            <Card key={t.ubicacion_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{t.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">ARS</span>
                  <span className="font-medium tabular-nums">
                    {Number(t.total_ars).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">USD</span>
                  <span className="font-medium tabular-nums">
                    {Number(t.total_usd).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Detalle por ubicación</h2>
        <div className="mb-4 flex flex-col gap-2 sm:max-w-md">
          <Label htmlFor="filtro-ubicacion">Ubicación</Label>
          <Select value={selectedId} onValueChange={(v) => void onUbicacionChange(v)} disabled={ubicaciones.length === 0}>
            <SelectTrigger id="filtro-ubicacion">
              <SelectValue placeholder="Elegir ubicación" />
            </SelectTrigger>
            <SelectContent>
              {ubicaciones.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedId && totalesById.has(selectedId) && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total acumulado (vista)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>ARS</span>
                  <span className="font-medium tabular-nums">
                    {Number(totalesById.get(selectedId)!.total_ars).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>USD</span>
                  <span className="font-medium tabular-nums">
                    {Number(totalesById.get(selectedId)!.total_usd).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suma del listado actual</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>ARS</span>
                  <span
                    className={`font-medium tabular-nums ${resumenSeleccion.ars < 0 ? "text-destructive" : ""}`}
                  >
                    {resumenSeleccion.ars.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>USD</span>
                  <span
                    className={`font-medium tabular-nums ${resumenSeleccion.usd < 0 ? "text-destructive" : ""}`}
                  >
                    {resumenSeleccion.usd.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {subtotalesPorFuente.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <p className="mb-2 text-sm font-medium text-foreground">Subtotales por origen ({selectedNombre})</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">ARS</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subtotalesPorFuente.map((s) => (
                  <TableRow key={s.fuente}>
                    <TableCell>{fuenteMovimientoLabel(s.fuente)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.ars.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.usd.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Cargando movimientos…</div>
            ) : movimientos.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No hay movimientos para esta ubicación.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((r) => {
                      const neg = Number(r.monto) < 0
                      return (
                        <TableRow key={`${r.fuente}-${r.origen_id}`}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatFecha(r.fecha)}
                          </TableCell>
                          <TableCell className="text-sm">{fuenteMovimientoLabel(r.fuente)}</TableCell>
                          <TableCell className="max-w-[14rem] truncate" title={r.detalle}>
                            {r.detalle}
                          </TableCell>
                          <TableCell>{r.moneda}</TableCell>
                          <TableCell
                            className={`text-right tabular-nums font-medium ${neg ? "text-destructive" : ""}`}
                          >
                            {moneySigned(r.moneda, Number(r.monto))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
