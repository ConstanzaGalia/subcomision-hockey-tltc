"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Plus, RefreshCw, Search, UserMinus, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  anioTemporada,
  divisionCodigoPorFecha,
  edadReal,
  formatDni,
  formatFechaAr,
} from "@/lib/categorias"
import type { BloqueRow, DivisionRow, JugadoraInput, JugadoraRow } from "@/lib/jugadoras"
import {
  createBloque,
  createJugadora,
  deleteBloque,
  moverJugadoraBloque,
  recalcularCategorias,
  renameBloque,
  setJugadoraActiva,
  updateJugadora,
} from "@/app/dashboard/admin/jugadoras/actions"

const SIN_BLOQUE = "sin-bloque"

type FormState = {
  apellido: string
  nombre: string
  dni: string
  fecha_nacimiento: string
  divisionManual: boolean
}

const EMPTY_FORM: FormState = {
  apellido: "",
  nombre: "",
  dni: "",
  fecha_nacimiento: "",
  divisionManual: false,
}

function nombreDivision(
  divisiones: DivisionRow[],
  codigo: string
): string {
  return divisiones.find((d) => d.codigo === codigo)?.nombre ?? codigo
}

function PlanillaTable({
  items,
  bloques,
  movingId,
  onMove,
  onEdit,
  onToggleActiva,
}: {
  items: JugadoraRow[]
  bloques: BloqueRow[]
  movingId: string | null
  onMove: (id: string, bloqueId: string | null) => void
  onEdit: (j: JugadoraRow) => void
  onToggleActiva: (j: JugadoraRow) => void
}) {
  if (items.length === 0) {
    return (
      <p className="px-2 py-6 text-sm text-muted-foreground">
        No hay jugadoras en este listado.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Apellido</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Fec. Nac.</TableHead>
            <TableHead className="text-right">Edad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Bloque</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((j) => (
            <TableRow key={j.id} className={j.activa ? undefined : "bg-red-50"}>
              <TableCell className="font-medium">{j.apellido}</TableCell>
              <TableCell>{j.nombre}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDni(j.dni)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatFechaAr(j.fecha_nacimiento)}
              </TableCell>
              <TableCell className="text-right">{edadReal(j.fecha_nacimiento)}</TableCell>
              <TableCell>
                {j.activa ? (
                  <Badge variant="secondary">Activa</Badge>
                ) : (
                  <Badge variant="destructive">Baja</Badge>
                )}
              </TableCell>
              <TableCell className="min-w-[10rem]">
                <Select
                  value={j.bloque_id ?? "none"}
                  disabled={movingId === j.id}
                  onValueChange={(value) =>
                    onMove(j.id, value === "none" ? null : value)
                  }
                >
                  <SelectTrigger size="sm" className="h-8 w-[10rem]">
                    <SelectValue placeholder="Sin bloque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin bloque</SelectItem>
                    {bloques
                      .filter((b) => b.division_id === j.division_id)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(j)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleActiva(j)}
                    aria-label={j.activa ? "Dar de baja" : "Reactivar"}
                    title={j.activa ? "Dar de baja" : "Reactivar"}
                  >
                    {j.activa ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function JugadorasClient({
  temporada,
  divisiones,
  bloques: bloquesIniciales,
  jugadoras: jugadorasIniciales,
  loadError,
}: {
  temporada: number
  divisiones: DivisionRow[]
  bloques: BloqueRow[]
  jugadoras: JugadoraRow[]
  loadError: string | null
}) {
  const router = useRouter()
  const [jugadoras, setJugadoras] = useState(jugadorasIniciales)
  const [bloques, setBloques] = useState(bloquesIniciales)
  const [search, setSearch] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todas" | "activas" | "baja">("todas")
  const [divisionId, setDivisionId] = useState(divisiones[0]?.id ?? "")
  const [bloqueVista, setBloqueVista] = useState(SIN_BLOQUE)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<JugadoraRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [recalculando, setRecalculando] = useState(false)

  const [bloqueDialog, setBloqueDialog] = useState<"create" | "rename" | null>(null)
  const [bloqueNombre, setBloqueNombre] = useState("")
  const [bloqueEditando, setBloqueEditando] = useState<BloqueRow | null>(null)
  const [savingBloque, setSavingBloque] = useState(false)

  const [toToggle, setToToggle] = useState<JugadoraRow | null>(null)
  const [toggling, setToggling] = useState(false)
  const [bloqueToDelete, setBloqueToDelete] = useState<BloqueRow | null>(null)

  useEffect(() => {
    setJugadoras(jugadorasIniciales)
  }, [jugadorasIniciales])

  useEffect(() => {
    setBloques(bloquesIniciales)
  }, [bloquesIniciales])

  useEffect(() => {
    if (divisiones.length && !divisiones.some((d) => d.id === divisionId)) {
      setDivisionId(divisiones[0].id)
    }
  }, [divisiones, divisionId])

  const bloquesDivision = useMemo(
    () => bloques.filter((b) => b.division_id === divisionId).sort((a, b) => a.orden - b.orden),
    [bloques, divisionId]
  )

  useEffect(() => {
    if (bloqueVista !== SIN_BLOQUE && !bloquesDivision.some((b) => b.id === bloqueVista)) {
      setBloqueVista(SIN_BLOQUE)
    }
  }, [bloquesDivision, bloqueVista])

  const q = search.trim().toLowerCase()
  const filtradas = useMemo(() => {
    return jugadoras.filter((j) => {
      if (estadoFiltro === "activas" && !j.activa) return false
      if (estadoFiltro === "baja" && j.activa) return false
      if (!q) return true
      const dniFmt = formatDni(j.dni)
      return (
        j.apellido.toLowerCase().includes(q) ||
        j.nombre.toLowerCase().includes(q) ||
        j.dni.includes(q.replace(/\D/g, "")) ||
        dniFmt.includes(q)
      )
    })
  }, [jugadoras, q, estadoFiltro])

  const porDivision = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of divisiones) counts[d.id] = 0
    for (const j of jugadoras) {
      if (!j.activa) continue
      counts[j.division_id] = (counts[j.division_id] ?? 0) + 1
    }
    return counts
  }, [divisiones, jugadoras])

  const deEstaDivision = filtradas.filter((j) => j.division_id === divisionId)
  const deEsteBloque =
    bloqueVista === SIN_BLOQUE
      ? deEstaDivision.filter((j) => !j.bloque_id)
      : deEstaDivision.filter((j) => j.bloque_id === bloqueVista)

  const edadPreview = form.fecha_nacimiento ? edadReal(form.fecha_nacimiento) : null
  const divisionPreview =
    form.fecha_nacimiento && !form.divisionManual
      ? nombreDivision(divisiones, divisionCodigoPorFecha(form.fecha_nacimiento, temporada))
      : form.divisionManual
        ? nombreDivision(divisiones, "preintermedia")
        : null

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(j: JugadoraRow) {
    setEditing(j)
    setForm({
      apellido: j.apellido,
      nombre: j.nombre,
      dni: formatDni(j.dni),
      fecha_nacimiento: j.fecha_nacimiento.slice(0, 10),
      divisionManual: j.division_manual,
    })
    setFormOpen(true)
  }

  async function handleSaveJugadora(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: JugadoraInput = { ...form }
    const result = editing
      ? await updateJugadora(editing.id, payload)
      : await createJugadora(payload)

    if (!result.ok) {
      toast.error(result.error)
      setSaving(false)
      return
    }

    setJugadoras((prev) => {
      if (editing) return prev.map((j) => (j.id === result.data.id ? result.data : j))
      return [...prev, result.data].sort((a, b) =>
        a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es")
      )
    })
    setDivisionId(result.data.division_id)
    setBloqueVista(result.data.bloque_id ?? SIN_BLOQUE)
    setFormOpen(false)
    toast.success(editing ? "Jugadora actualizada" : "Jugadora agregada")
    setSaving(false)
    router.refresh()
  }

  async function handleMove(id: string, bloqueId: string | null) {
    const prev = jugadoras
    setMovingId(id)
    setJugadoras((list) =>
      list.map((j) => (j.id === id ? { ...j, bloque_id: bloqueId } : j))
    )
    const result = await moverJugadoraBloque(id, bloqueId)
    if (!result.ok) {
      setJugadoras(prev)
      toast.error(result.error)
    }
    setMovingId(null)
  }

  async function handleToggleActiva() {
    if (!toToggle) return
    setToggling(true)
    const next = !toToggle.activa
    const result = await setJugadoraActiva(toToggle.id, next)
    if (!result.ok) {
      toast.error(result.error)
      setToggling(false)
      return
    }
    setJugadoras((prev) => prev.map((j) => (j.id === result.data.id ? result.data : j)))
    toast.success(next ? "Jugadora reactivada" : "Jugadora dada de baja")
    setToToggle(null)
    setToggling(false)
    router.refresh()
  }

  async function handleSaveBloque(e: React.FormEvent) {
    e.preventDefault()
    setSavingBloque(true)
    if (bloqueDialog === "rename" && bloqueEditando) {
      const result = await renameBloque(bloqueEditando.id, bloqueNombre)
      if (!result.ok) {
        toast.error(result.error)
        setSavingBloque(false)
        return
      }
      setBloques((prev) => prev.map((b) => (b.id === result.data.id ? result.data : b)))
      toast.success("Bloque actualizado")
    } else {
      const result = await createBloque(divisionId, bloqueNombre)
      if (!result.ok) {
        toast.error(result.error)
        setSavingBloque(false)
        return
      }
      setBloques((prev) => [...prev, result.data])
      setBloqueVista(result.data.id)
      toast.success("Bloque creado")
    }
    setBloqueDialog(null)
    setBloqueNombre("")
    setBloqueEditando(null)
    setSavingBloque(false)
    router.refresh()
  }

  async function handleDeleteBloque() {
    if (!bloqueToDelete) return
    setSavingBloque(true)
    const result = await deleteBloque(bloqueToDelete.id)
    if (!result.ok) {
      toast.error(result.error)
      setSavingBloque(false)
      return
    }
    setBloques((prev) => prev.filter((b) => b.id !== bloqueToDelete.id))
    setJugadoras((prev) =>
      prev.map((j) =>
        j.bloque_id === bloqueToDelete.id ? { ...j, bloque_id: null } : j
      )
    )
    setBloqueVista(SIN_BLOQUE)
    toast.success("Bloque eliminado")
    setBloqueToDelete(null)
    setSavingBloque(false)
    router.refresh()
  }

  async function handleRecalcular() {
    setRecalculando(true)
    const result = await recalcularCategorias()
    if (!result.ok) {
      toast.error(result.error)
      setRecalculando(false)
      return
    }
    toast.success(
      result.data.actualizadas === 0
        ? "Ninguna categoría cambió"
        : `Se actualizaron ${result.data.actualizadas} jugadoras`
    )
    setRecalculando(false)
    router.refresh()
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-foreground">Jugadoras</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jugadoras</h1>
          <p className="text-muted-foreground leading-relaxed">
            Temporada {temporada}. La división se arma por el año que cumplen; la
            edad de la planilla son los años cumplidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRecalcular}
            disabled={recalculando}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {recalculando ? "Recalculando..." : "Recalcular categorías"}
          </Button>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva jugadora
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por apellido, nombre o DNI"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={estadoFiltro}
          onValueChange={(v) => setEstadoFiltro(v as "todas" | "activas" | "baja")}
        >
          <SelectTrigger className="w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="activas">Activas</SelectItem>
            <SelectItem value="baja">De baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {q ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultados ({filtradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanillaTable
              items={filtradas}
              bloques={bloques}
              movingId={movingId}
              onMove={handleMove}
              onEdit={openEdit}
              onToggleActiva={setToToggle}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={divisionId}
          onValueChange={(id) => {
            setDivisionId(id)
            setBloqueVista(SIN_BLOQUE)
          }}
        >
          <TabsList className="mb-4 flex h-auto min-h-9 w-full flex-wrap justify-start">
            {divisiones.map((d) => (
              <TabsTrigger key={d.id} value={d.id} className="flex-none px-3">
                {d.nombre}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({porDivision[d.id] ?? 0})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {divisiones.map((d) => (
            <TabsContent key={d.id} value={d.id} className="space-y-4">
              <Tabs value={bloqueVista} onValueChange={setBloqueVista}>
                <TabsList className="mb-3 flex h-auto min-h-9 w-full flex-wrap justify-start">
                  <TabsTrigger value={SIN_BLOQUE} className="flex-none">
                    Sin bloque (
                    {deEstaDivision.filter((j) => !j.bloque_id).length})
                  </TabsTrigger>
                  {bloquesDivision.map((b) => (
                    <TabsTrigger key={b.id} value={b.id} className="flex-none">
                      {d.nombre} {b.nombre} (
                      {deEstaDivision.filter((j) => j.bloque_id === b.id).length})
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {bloqueVista === SIN_BLOQUE
                        ? `${d.nombre} — sin bloque`
                        : `${d.nombre} ${
                            bloquesDivision.find((b) => b.id === bloqueVista)?.nombre ?? ""
                          }`}
                    </CardTitle>
                    <CardAction>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBloqueEditando(null)
                            setBloqueNombre("")
                            setBloqueDialog("create")
                          }}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          Crear bloque
                        </Button>
                        {bloqueVista !== SIN_BLOQUE && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const b = bloquesDivision.find((x) => x.id === bloqueVista)
                                if (!b) return
                                setBloqueEditando(b)
                                setBloqueNombre(b.nombre)
                                setBloqueDialog("rename")
                              }}
                            >
                              Renombrar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const b = bloquesDivision.find((x) => x.id === bloqueVista)
                                if (b) setBloqueToDelete(b)
                              }}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <PlanillaTable
                      items={deEsteBloque}
                      bloques={bloquesDivision}
                      movingId={movingId}
                      onMove={handleMove}
                      onEdit={openEdit}
                      onToggleActiva={setToToggle}
                    />
                  </CardContent>
                </Card>
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <form onSubmit={handleSaveJugadora}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar jugadora" : "Nueva jugadora"}</DialogTitle>
              <DialogDescription>
                Apellido y nombre separados, DNI y fecha de nacimiento.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={form.apellido}
                    onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  inputMode="numeric"
                  placeholder="40.087.929"
                  value={form.dni}
                  onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  max={`${anioTemporada()}-12-31`}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))
                  }
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Edad: {edadPreview ?? "—"}
                {divisionPreview ? ` · División: ${divisionPreview}` : ""}
              </p>
              <div className="flex flex-col gap-2">
                <Label>División</Label>
                <Select
                  value={form.divisionManual ? "preintermedia" : "auto"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, divisionManual: v === "preintermedia" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática (según fecha)</SelectItem>
                    <SelectItem value="preintermedia">Preintermedia (college)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bloqueDialog !== null}
        onOpenChange={(open) => {
          if (!open) setBloqueDialog(null)
        }}
      >
        <DialogContent>
          <form onSubmit={handleSaveBloque}>
            <DialogHeader>
              <DialogTitle>
                {bloqueDialog === "rename" ? "Renombrar bloque" : "Nuevo bloque"}
              </DialogTitle>
              <DialogDescription>
                Nombre libre dentro de la división (por ejemplo Azul).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="bloque-nombre">Nombre</Label>
              <Input
                id="bloque-nombre"
                className="mt-2"
                value={bloqueNombre}
                onChange={(e) => setBloqueNombre(e.target.value)}
                placeholder="Azul"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBloqueDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingBloque}>
                {savingBloque ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toToggle} onOpenChange={(open) => !open && setToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.activa ? "Dar de baja" : "Reactivar jugadora"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle
                ? toToggle.activa
                  ? `Se dará de baja a ${toToggle.apellido}, ${toToggle.nombre}. Podés reactivarla después.`
                  : `Se reactivará a ${toToggle.apellido}, ${toToggle.nombre}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActiva} disabled={toggling}>
              {toggling
                ? "Guardando..."
                : toToggle?.activa
                  ? "Dar de baja"
                  : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!bloqueToDelete}
        onOpenChange={(open) => !open && setBloqueToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar bloque</AlertDialogTitle>
            <AlertDialogDescription>
              {bloqueToDelete
                ? `Se eliminará el bloque ${bloqueToDelete.nombre}. Las jugadoras quedan sin bloque.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingBloque}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBloque} disabled={savingBloque}>
              {savingBloque ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
