"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import {
  deleteBalanceMovimiento,
  updateBalanceMovimiento,
  type BalanceMovimientoUpdate,
} from "@/app/dashboard/balance/actions"
import { UbicacionSelect } from "@/components/ubicacion-select"
import type { UbicacionOption } from "@/lib/ubicaciones"

export type BalanceMovimiento = {
  id: string
  tipo: "INGRESO" | "GASTO"
  moneda: "ARS" | "USD"
  monto: number
  descripcion: string | null
  fecha: string // YYYY-MM-DD
  created_at: string
  updated_at?: string
  user_id: string
  ubicacion_id: string
  ubicacion_nombre?: string | null
}

function todayISODate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function formatFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-")
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}/${y}`
}

function moneyLabel(moneda: "ARS" | "USD", monto: number): string {
  const prefix = moneda === "ARS" ? "ARS" : "USD"
  return `${prefix} ${Number(monto).toLocaleString("es-AR")}`
}

export function BalanceClient({
  initialMovimientos,
  ubicaciones,
  defaultUbicacionId,
}: {
  initialMovimientos: BalanceMovimiento[]
  ubicaciones: UbicacionOption[]
  defaultUbicacionId: string
}) {
  const [movimientos, setMovimientos] = useState<BalanceMovimiento[]>(initialMovimientos)
  const router = useRouter()

  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tipo, setTipo] = useState<BalanceMovimiento["tipo"]>("INGRESO")
  const [moneda, setMoneda] = useState<BalanceMovimiento["moneda"]>("ARS")
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState(todayISODate())
  const [ubicacionId, setUbicacionId] = useState(defaultUbicacionId)

  const [openEdit, setOpenEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editing, setEditing] = useState<BalanceMovimiento | null>(null)
  const [editTipo, setEditTipo] = useState<BalanceMovimiento["tipo"]>("INGRESO")
  const [editMoneda, setEditMoneda] = useState<BalanceMovimiento["moneda"]>("ARS")
  const [editMonto, setEditMonto] = useState("")
  const [editDescripcion, setEditDescripcion] = useState("")
  const [editFecha, setEditFecha] = useState(todayISODate())
  const [editUbicacionId, setEditUbicacionId] = useState("")

  const [openDelete, setOpenDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toDelete, setToDelete] = useState<BalanceMovimiento | null>(null)

  const totals = useMemo(() => {
    const base = {
      ingresosARS: 0,
      ingresosUSD: 0,
      gastosARS: 0,
      gastosUSD: 0,
    }
    for (const m of movimientos) {
      const value = Number(m.monto) || 0
      if (m.tipo === "INGRESO" && m.moneda === "ARS") base.ingresosARS += value
      if (m.tipo === "INGRESO" && m.moneda === "USD") base.ingresosUSD += value
      if (m.tipo === "GASTO" && m.moneda === "ARS") base.gastosARS += value
      if (m.tipo === "GASTO" && m.moneda === "USD") base.gastosUSD += value
    }
    return base
  }, [movimientos])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = Number.parseFloat(monto)
    if (Number.isNaN(montoNum) || montoNum < 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (!fecha) {
      toast.error("Seleccioná una fecha")
      return
    }

    setCreating(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("No estás autenticado")
      setCreating(false)
      return
    }

    if (!ubicacionId) {
      toast.error("Seleccioná una ubicación")
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from("balance_movimientos")
      .insert({
        tipo,
        moneda,
        monto: montoNum,
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        fecha,
        user_id: user.id,
        ubicacion_id: ubicacionId,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al guardar", { description: error.message })
      setCreating(false)
      return
    }

    const ubNombre = ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? null
    setMovimientos((prev) => [{ ...(data as BalanceMovimiento), ubicacion_nombre: ubNombre }, ...prev])
    setMonto("")
    setDescripcion("")
    setFecha(todayISODate())
    setTipo("INGRESO")
    setMoneda("ARS")
    setUbicacionId(defaultUbicacionId)
    setOpenCreate(false)
    setCreating(false)
    toast.success("Movimiento registrado")
    router.refresh()
  }

  function openEditDialog(m: BalanceMovimiento) {
    setEditing(m)
    setEditTipo(m.tipo)
    setEditMoneda(m.moneda)
    setEditMonto(String(m.monto))
    setEditDescripcion(m.descripcion ?? "")
    setEditFecha(m.fecha)
    setEditUbicacionId(m.ubicacion_id || defaultUbicacionId)
    setOpenEdit(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return

    const montoNum = Number.parseFloat(editMonto)
    if (Number.isNaN(montoNum) || montoNum < 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (!editFecha) {
      toast.error("Seleccioná una fecha")
      return
    }

    if (!editUbicacionId) {
      toast.error("Seleccioná una ubicación")
      return
    }

    const payload: BalanceMovimientoUpdate = {
      tipo: editTipo,
      moneda: editMoneda,
      monto: montoNum,
      descripcion: editDescripcion.trim() ? editDescripcion.trim() : null,
      fecha: editFecha,
      ubicacion_id: editUbicacionId,
    }

    setSavingEdit(true)
    const result = await updateBalanceMovimiento(editing.id, payload)
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingEdit(false)
      return
    }

    const ubNombre = ubicaciones.find((u) => u.id === editUbicacionId)?.nombre ?? null
    setMovimientos((prev) =>
      prev.map((x) =>
        x.id === editing.id ? { ...x, ...payload, ubicacion_nombre: ubNombre } : x
      )
    )
    setSavingEdit(false)
    setOpenEdit(false)
    setEditing(null)
    toast.success("Movimiento actualizado")
    router.refresh()
  }

  function openDeleteDialog(m: BalanceMovimiento) {
    setToDelete(m)
    setOpenDelete(true)
  }

  async function handleConfirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const result = await deleteBalanceMovimiento(toDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeleting(false)
      setOpenDelete(false)
      setToDelete(null)
      return
    }
    setMovimientos((prev) => prev.filter((x) => x.id !== toDelete.id))
    setDeleting(false)
    setOpenDelete(false)
    setToDelete(null)
    toast.success("Movimiento eliminado")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (ARS)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {moneyLabel("ARS", totals.ingresosARS)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (USD)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {moneyLabel("USD", totals.ingresosUSD)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos (ARS)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {moneyLabel("ARS", totals.gastosARS)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos (USD)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {moneyLabel("USD", totals.gastosUSD)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Movimientos</h2>
        <Dialog
          open={openCreate}
          onOpenChange={(o) => {
            setOpenCreate(o)
            if (o) setUbicacionId(defaultUbicacionId)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar movimiento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nuevo movimiento</DialogTitle>
                <DialogDescription>
                  Cargá un ingreso o gasto, indicando la moneda.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as BalanceMovimiento["tipo"])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="GASTO">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Moneda</Label>
                    <Select value={moneda} onValueChange={(v) => setMoneda(v as BalanceMovimiento["moneda"])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="monto">Monto</Label>
                    <Input
                      id="monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    placeholder="Ej: pago proveedor / cuota / etc."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>
                <UbicacionSelect
                  id="ubicacion-balance"
                  value={ubicacionId}
                  onValueChange={setUbicacionId}
                  ubicaciones={ubicaciones}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Editar movimiento</DialogTitle>
                <DialogDescription>Modificá tipo, moneda, monto o fecha.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Tipo</Label>
                    <Select value={editTipo} onValueChange={(v) => setEditTipo(v as BalanceMovimiento["tipo"])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INGRESO">Ingreso</SelectItem>
                        <SelectItem value="GASTO">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Moneda</Label>
                    <Select value={editMoneda} onValueChange={(v) => setEditMoneda(v as BalanceMovimiento["moneda"])}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-monto">Monto</Label>
                    <Input
                      id="edit-monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-fecha">Fecha</Label>
                    <Input
                      id="edit-fecha"
                      type="date"
                      value={editFecha}
                      onChange={(e) => setEditFecha(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-descripcion">Descripción (opcional)</Label>
                  <Input
                    id="edit-descripcion"
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                  />
                </div>
                <UbicacionSelect
                  id="ubicacion-balance-edit"
                  value={editUbicacionId}
                  onValueChange={setEditUbicacionId}
                  ubicaciones={ubicaciones}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar movimiento</AlertDialogTitle>
              <AlertDialogDescription>
                {toDelete ? (
                  <>
                    Se eliminará el{" "}
                    <strong>{toDelete.tipo === "INGRESO" ? "ingreso" : "gasto"}</strong>{" "}
                    por <strong>{moneyLabel(toDelete.moneda, Number(toDelete.monto))}</strong> del{" "}
                    <strong>{formatFecha(toDelete.fecha)}</strong>. Esta acción no se puede deshacer.
                  </>
                ) : (
                  "Esta acción no se puede deshacer."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void handleConfirmDelete()
                }}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowUpCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">No hay movimientos registrados</p>
              <p className="text-sm text-muted-foreground/70">Agregá el primero con el botón de arriba.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">N.&deg;</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m, index) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {String(movimientos.length - index).padStart(4, "0")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {m.tipo === "INGRESO" ? "Ingreso" : "Gasto"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.moneda}</TableCell>
                    <TableCell className="text-foreground">{moneyLabel(m.moneda, Number(m.monto))}</TableCell>
                    <TableCell className="text-muted-foreground">{formatFecha(m.fecha)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.ubicacion_nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.descripcion?.trim() ? m.descripcion : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(m)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(m)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

