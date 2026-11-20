"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { normalizarDni } from "@/lib/categorias"
import { nameTokens, normalizePersonName } from "@/lib/match-jugadora"
import {
  labelEstadoCuota,
  type PortalCuotaEstadoFiltro,
  type PortalCuotaEstadoRow,
} from "@/lib/portal-cuota-estado"

const TODAS = "todas"
const SIN_BLOQUE = "sin-bloque"

function matchesSearch(row: PortalCuotaEstadoRow, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const digits = normalizarDni(q)
  if (digits && normalizarDni(row.dni).includes(digits)) return true
  const tokens = nameTokens(q)
  if (tokens.length === 0) return true
  const haystack = normalizePersonName(`${row.apellido} ${row.nombre} ${row.dni}`)
  return tokens.every((t) => haystack.includes(t))
}

export function PortalCuotaEstadoClient({
  rows,
}: {
  rows: PortalCuotaEstadoRow[]
}) {
  const [search, setSearch] = useState("")
  const [divisionId, setDivisionId] = useState(TODAS)
  const [bloqueId, setBloqueId] = useState(TODAS)
  const [estado, setEstado] = useState<PortalCuotaEstadoFiltro>("todas")

  const divisiones = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (!map.has(r.division_id)) map.set(r.division_id, r.division_nombre)
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  }, [rows])

  const bloques = useMemo(() => {
    const map = new Map<string, string>()
    let hasSinBloque = false
    for (const r of rows) {
      if (divisionId !== TODAS && r.division_id !== divisionId) continue
      if (!r.bloque_id) {
        hasSinBloque = true
        continue
      }
      if (!map.has(r.bloque_id)) {
        map.set(r.bloque_id, r.bloque_nombre ?? "Bloque")
      }
    }
    const list = [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    return { list, hasSinBloque }
  }, [rows, divisionId])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (divisionId !== TODAS && r.division_id !== divisionId) return false
      if (bloqueId === SIN_BLOQUE && r.bloque_id != null) return false
      if (bloqueId !== TODAS && bloqueId !== SIN_BLOQUE && r.bloque_id !== bloqueId) {
        return false
      }
      if (estado === "pago" && !r.pago) return false
      if (estado === "debe" && r.pago) return false
      return matchesSearch(r, search)
    })
  }, [rows, divisionId, bloqueId, estado, search])

  const pagaron = filtered.filter((r) => r.pago).length
  const deben = filtered.length - pagaron

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Cuota extraordinaria — plantel
        </h2>
        <p className="text-sm text-muted-foreground">
          Consultá quién pagó y quién debe. Filtrá por división, bloque o buscá por nombre/DNI.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border px-3 py-2">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-semibold text-foreground">{filtered.length}</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-xs text-muted-foreground">Pagaron</p>
          <p className="text-xl font-semibold text-emerald-700">{pagaron}</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-xs text-muted-foreground">Deben</p>
          <p className="text-xl font-semibold text-amber-700">{deben}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar apellido, nombre o DNI"
            className="pl-9"
          />
        </div>
        <Select
          value={divisionId}
          onValueChange={(v) => {
            setDivisionId(v)
            setBloqueId(TODAS)
          }}
        >
          <SelectTrigger className="w-full sm:w-[11rem]">
            <SelectValue placeholder="División" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas las divisiones</SelectItem>
            {divisiones.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={bloqueId} onValueChange={setBloqueId}>
          <SelectTrigger className="w-full sm:w-[11rem]">
            <SelectValue placeholder="Bloque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todos los bloques</SelectItem>
            {bloques.hasSinBloque ? (
              <SelectItem value={SIN_BLOQUE}>Sin bloque</SelectItem>
            ) : null}
            {bloques.list.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={estado}
          onValueChange={(v) => setEstado(v as PortalCuotaEstadoFiltro)}
        >
          <SelectTrigger className="w-full sm:w-[9rem]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="pago">Pagó</SelectItem>
            <SelectItem value="debe">Debe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay jugadoras con ese filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellido</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>División</TableHead>
                <TableHead>Bloque</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.jugadora_id}>
                  <TableCell className="font-medium">{r.apellido}</TableCell>
                  <TableCell>{r.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{r.division_nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.bloque_nombre ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        r.pago
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-900 hover:bg-amber-100"
                      }
                      title={
                        r.pago
                          ? `Pagos: ${r.pagos_count}${
                              r.ultima_fecha ? ` · Último: ${r.ultima_fecha}` : ""
                            }`
                          : undefined
                      }
                    >
                      {labelEstadoCuota(r.pago)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
