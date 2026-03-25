"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, FileDown, DollarSign, Banknote } from "lucide-react"
import { generateExtraordinaryReceipt } from "@/lib/generate-receipt"
import {
  deleteCuotaExtraordinaria,
  markReciboGenerated,
  updateCuotaExtraordinaria,
} from "@/app/dashboard/cuota-extraordinaria/actions"

type Moneda = "USD" | "ARS"
type MetodoPago = "EFECTIVO" | "TRANSFERENCIA"

export type CuotaExtraordinariaRow = {
  id: string
  nombre_apellido: string
  moneda: Moneda
  metodo_pago: MetodoPago
  monto: number
  fecha: string // YYYY-MM-DD
  created_at: string
  user_id: string
  recibo_generado_por_nombre_apellido?: string | null
  recibo_generado_por?: string | null
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

function moneyLabel(moneda: Moneda, monto: number): string {
  const prefix = moneda === "ARS" ? "ARS" : "USD"
  return `${prefix} ${Number(monto).toLocaleString("es-AR")}`
}

export function CuotaExtraordinariaClient({ initialCuotas }: { initialCuotas: CuotaExtraordinariaRow[] }) {
  const [cuotas, setCuotas] = useState<CuotaExtraordinariaRow[]>(initialCuotas)
  const router = useRouter()

  const [openCreate, setOpenCreate] = useState(false)
  const [nombre, setNombre] = useState("")
  const [moneda, setMoneda] = useState<Moneda>("USD")
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(todayISODate())
  const [creating, setCreating] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [editingCuota, setEditingCuota] = useState<CuotaExtraordinariaRow | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editMoneda, setEditMoneda] = useState<Moneda>("USD")
  const [editMetodoPago, setEditMetodoPago] = useState<MetodoPago>("EFECTIVO")
  const [editMonto, setEditMonto] = useState("")
  const [editFecha, setEditFecha] = useState(todayISODate())
  const [savingEdit, setSavingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [toDelete, setToDelete] = useState<CuotaExtraordinariaRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const totals = useMemo(() => {
    let usd = 0
    let ars = 0
    for (const c of cuotas) {
      const value = Number(c.monto) || 0
      if (c.moneda === "USD") usd += value
      if (c.moneda === "ARS") ars += value
    }
    return { usd, ars }
  }, [cuotas])

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

    const { data, error } = await supabase
      .from("cuota_extraordinaria")
      .insert({
        nombre_apellido: nombre.trim(),
        moneda,
        metodo_pago: metodoPago,
        monto: montoNum,
        fecha,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al guardar", { description: error.message })
      setCreating(false)
      return
    }

    setCuotas((prev) => [
      {
        ...(data as CuotaExtraordinariaRow),
        recibo_generado_por_nombre_apellido: null,
      },
      ...prev,
    ])

    setOpenCreate(false)
    setNombre("")
    setMoneda("USD")
    setMetodoPago("EFECTIVO")
    setMonto("")
    setFecha(todayISODate())
    setCreating(false)
    toast.success("Cuota registrada")
    router.refresh()
  }

  function openEditDialog(c: CuotaExtraordinariaRow) {
    setEditingCuota(c)
    setEditNombre(c.nombre_apellido)
    setEditMoneda(c.moneda)
    setEditMetodoPago(c.metodo_pago)
    setEditMonto(String(c.monto))
    setEditFecha(c.fecha)
    setOpenEdit(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCuota) return

    const montoNum = Number.parseFloat(editMonto)
    if (Number.isNaN(montoNum) || montoNum < 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (!editFecha) {
      toast.error("Seleccioná una fecha")
      return
    }

    setSavingEdit(true)
    const result = await updateCuotaExtraordinaria(editingCuota.id, {
      nombre_apellido: editNombre.trim(),
      moneda: editMoneda,
      metodo_pago: editMetodoPago,
      monto: montoNum,
      fecha: editFecha,
    })

    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingEdit(false)
      return
    }

    setCuotas((prev) =>
      prev.map((x) =>
        x.id === editingCuota.id
          ? {
              ...x,
              nombre_apellido: editNombre.trim(),
              moneda: editMoneda,
              metodo_pago: editMetodoPago,
              monto: montoNum,
              fecha: editFecha,
            }
          : x,
      ),
    )

    setOpenEdit(false)
    setEditingCuota(null)
    setSavingEdit(false)
    toast.success("Cuota actualizada")
    router.refresh()
  }

  function openDeleteDialog(c: CuotaExtraordinariaRow) {
    setToDelete(c)
    setOpenDelete(true)
  }

  async function handleConfirmDelete() {
    if (!toDelete) return
    setDeleting(true)

    const result = await deleteCuotaExtraordinaria(toDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeleting(false)
      setOpenDelete(false)
      return
    }

    setCuotas((prev) => prev.filter((x) => x.id !== toDelete.id))
    setDeleting(false)
    setOpenDelete(false)
    setToDelete(null)
    toast.success("Cuota eliminada")
    router.refresh()
  }

  async function handleDownloadReceipt(cuota: CuotaExtraordinariaRow, index: number) {
    const receiptNumber = cuotas.length - index

    try {
      await generateExtraordinaryReceipt({
        receiptNumber,
        nombreApellido: cuota.nombre_apellido,
        moneda: cuota.moneda,
        metodoPago: cuota.metodo_pago,
        monto: Number(cuota.monto),
        fecha: cuota.fecha,
      })

      toast.success("Recibo descargado")

      const mark = await markReciboGenerated(cuota.id)
      if (!mark.ok) {
        toast.error("No se pudo registrar el generador del recibo", { description: mark.error })
        return
      }

      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al generar el PDF"
      toast.error("Error al generar el PDF", { description: message })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              USD {totals.usd.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (ARS)</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ARS {totals.ars.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Listado de Cuotas</h2>

        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Cuota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nueva Cuota Extraordinaria</DialogTitle>
                <DialogDescription>Registrá un ingreso de cuota extraordinaria.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="nombre">Nombre y Apellido</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Juan Perez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Moneda</Label>
                  <Select
                    value={moneda}
                    onValueChange={(v) => {
                      const nextMoneda = v as Moneda
                      setMoneda(nextMoneda)
                      // Regla: USD solo admite efectivo.
                      if (nextMoneda === "USD") setMetodoPago("EFECTIVO")
                    }}
                  >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Método de pago</Label>
                    <Select
                      value={metodoPago}
                      onValueChange={(v) => setMetodoPago(v as MetodoPago)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        {moneda === "ARS" && <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="monto">Monto</Label>
                    <Input
                      id="monto"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 200"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </div>
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
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="p-0">
            {cuotas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">No hay cuotas registradas</p>
                <p className="text-sm text-muted-foreground/70">Agregá la primera con el botón de arriba.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre y Apellido</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                    <TableHead>Método de pago</TableHead>
                      <TableHead>Generador de recibo PDF</TableHead>
                      <TableHead className="text-right w-28">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota, index) => (
                      <TableRow key={cuota.id}>
                        <TableCell className="font-medium text-foreground">{cuota.nombre_apellido}</TableCell>
                        <TableCell className="text-foreground">{moneyLabel(cuota.moneda, Number(cuota.monto))}</TableCell>
                        <TableCell className="text-muted-foreground">{formatFecha(cuota.fecha)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cuota.metodo_pago === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReceipt(cuota, index)}
                              className="text-primary hover:text-primary/80 shrink-0"
                            >
                              <FileDown className="mr-1 h-4 w-4" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(cuota)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:font-bold"
                              onClick={() => openDeleteDialog(cuota)}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Editar cuota</DialogTitle>
              <DialogDescription>Corrige nombre, moneda, monto o fecha.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-nombre">Nombre y Apellido</Label>
                <Input
                  id="edit-nombre"
                  placeholder="Ej: Juan Perez"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Moneda</Label>
                    <Select
                      value={editMoneda}
                      onValueChange={(v) => {
                        const nextMoneda = v as Moneda
                        setEditMoneda(nextMoneda)
                        if (nextMoneda === "USD") setEditMetodoPago("EFECTIVO")
                      }}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-monto">Monto</Label>
                  <Input
                    id="edit-monto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 200"
                    value={editMonto}
                    onChange={(e) => setEditMonto(e.target.value)}
                    required
                  />
                </div>
              </div>

                <div className="flex flex-col gap-2">
                  <Label>Método de pago</Label>
                  <Select value={editMetodoPago} onValueChange={(v) => setEditMetodoPago(v as MetodoPago)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      {editMoneda === "ARS" && <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-fecha">Fecha</Label>
                <Input id="edit-fecha" type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} required />
              </div>
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
            <AlertDialogTitle>Eliminar cuota</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? (
                <>
                  Se eliminará la cuota de <strong>{toDelete.nombre_apellido}</strong> por{" "}
                  <strong>{moneyLabel(toDelete.moneda, Number(toDelete.monto))}</strong> del{" "}
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
  )
}

