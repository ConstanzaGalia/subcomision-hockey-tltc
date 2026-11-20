"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
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

function estadoBadgeClass(pago: boolean) {
  return pago
    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
    : "bg-red-100 text-red-800 hover:bg-red-100"
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Plantel — cuota</h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Quién pagó y quién debe. Buscá o filtrá por división y bloque.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border px-3 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-lg font-semibold tabular-nums">{filtered.length}</p>
        </div>
        <div className="rounded-xl border px-3 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">Pagaron</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-700">{pagaron}</p>
        </div>
        <div className="rounded-xl border px-3 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">Deben</p>
          <p className="text-lg font-semibold tabular-nums text-red-700">{deben}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Apellido, nombre o DNI"
            className="h-11 pl-9 text-base"
            inputMode="search"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Select
            value={divisionId}
            onValueChange={(v) => {
              setDivisionId(v)
              setBloqueId(TODAS)
            }}
          >
            <SelectTrigger className="h-11 w-full text-base">
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
            <SelectTrigger className="h-11 w-full text-base">
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
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["todas", "Todas"],
              ["pago", "Pagó"],
              ["debe", "Debe"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={estado === value ? "default" : "outline"}
              className="h-11"
              onClick={() => setEstado(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay jugadoras con ese filtro.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {filtered.map((r) => (
            <li
              key={r.jugadora_id}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {r.apellido}, {r.nombre}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.division_nombre}
                  {r.bloque_nombre ? ` · ${r.bloque_nombre}` : ""}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={cn("shrink-0", estadoBadgeClass(r.pago))}
              >
                {labelEstadoCuota(r.pago)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
