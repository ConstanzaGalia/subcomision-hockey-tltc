"use client"

import { useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, DollarSign, Users, Pencil, Trash2, Banknote, FileDown } from "lucide-react"
import { toast } from "sonner"
import { updatePrestamo, deletePrestamo, toggleDevuelto } from "@/app/dashboard/prestamos/actions"
import { generatePrestamoReceipt } from "@/lib/generate-receipt"
import { UbicacionSelect } from "@/components/ubicacion-select"
import type { UbicacionOption } from "@/lib/ubicaciones"

interface Prestamo {
  id: string
  nombre_apellido: string
  monto: number
  devuelto: boolean
  created_at: string
  user_id: string
  ubicacion_id: string
  ubicacion_nombre?: string | null
}

export function PrestamosClient({
  initialPrestamos,
  ubicaciones,
  defaultUbicacionId,
}: {
  initialPrestamos: Prestamo[]
  ubicaciones: UbicacionOption[]
  defaultUbicacionId: string
}) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>(initialPrestamos)
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [monto, setMonto] = useState("")
  const [ubicacionId, setUbicacionId] = useState(defaultUbicacionId)
  const [loading, setLoading] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingPrestamo, setEditingPrestamo] = useState<Prestamo | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editMonto, setEditMonto] = useState("")
  const [editUbicacionId, setEditUbicacionId] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [prestamoToDelete, setPrestamoToDelete] = useState<Prestamo | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouter()

  const totalPrestado = prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
  const pendientes = prestamos.filter((p) => !p.devuelto).length

  async function handleAddPrestamo(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("No estas autenticado")
      setLoading(false)
      return
    }
    if (!ubicacionId) {
      toast.error("Seleccioná una ubicación")
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from("prestamos")
      .insert({
        nombre_apellido: nombre.trim(),
        monto: parseFloat(monto),
        user_id: user.id,
        ubicacion_id: ubicacionId,
      })
      .select()
      .single()
    if (error) {
      toast.error("Error al agregar el préstamo", { description: error.message })
      setLoading(false)
      return
    }
    const ubNombre = ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? null
    setPrestamos([{ ...(data as Prestamo), ubicacion_nombre: ubNombre }, ...prestamos])
    setNombre("")
    setMonto("")
    setUbicacionId(defaultUbicacionId)
    setOpen(false)
    setLoading(false)
    toast.success("Préstamo registrado")
    router.refresh()
  }

  async function handleToggleDevuelto(prestamoId: string, devuelto: boolean) {
    setTogglingId(prestamoId)
    const result = await toggleDevuelto(prestamoId, devuelto)
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
    } else {
      setPrestamos((prev) =>
        prev.map((p) => (p.id === prestamoId ? { ...p, devuelto } : p))
      )
      router.refresh()
    }
    setTogglingId(null)
  }

  function openEditDialog(p: Prestamo) {
    setEditingPrestamo(p)
    setEditNombre(p.nombre_apellido)
    setEditMonto(String(p.monto))
    setEditUbicacionId(p.ubicacion_id || defaultUbicacionId)
    setOpenEdit(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPrestamo) return
    if (!editUbicacionId) {
      toast.error("Seleccioná una ubicación")
      return
    }
    setSavingEdit(true)
    const result = await updatePrestamo(editingPrestamo.id, {
      nombre_apellido: editNombre.trim(),
      monto: parseFloat(editMonto),
      ubicacion_id: editUbicacionId,
    })
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingEdit(false)
      return
    }
    const ubNombre = ubicaciones.find((u) => u.id === editUbicacionId)?.nombre ?? null
    setPrestamos((prev) =>
      prev.map((p) =>
        p.id === editingPrestamo.id
          ? {
              ...p,
              nombre_apellido: editNombre.trim(),
              monto: parseFloat(editMonto),
              ubicacion_id: editUbicacionId,
              ubicacion_nombre: ubNombre,
            }
          : p
      )
    )
    setOpenEdit(false)
    setEditingPrestamo(null)
    setSavingEdit(false)
    toast.success("Préstamo actualizado")
    router.refresh()
  }

  function openDeleteDialog(p: Prestamo) {
    setPrestamoToDelete(p)
    setOpenDelete(true)
  }

  async function handleConfirmDelete() {
    if (!prestamoToDelete) return
    setDeleting(true)
    const result = await deletePrestamo(prestamoToDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeleting(false)
      setOpenDelete(false)
      setPrestamoToDelete(null)
      return
    }
    setPrestamos((prev) => prev.filter((p) => p.id !== prestamoToDelete.id))
    setOpenDelete(false)
    setPrestamoToDelete(null)
    setDeleting(false)
    toast.success("Préstamo eliminado")
    router.refresh()
  }

  async function handleDownloadReceipt(prestamo: Prestamo, index: number) {
    const receiptNumber = prestamos.length - index
    try {
      await generatePrestamoReceipt({
        receiptNumber,
        nombreApellido: prestamo.nombre_apellido,
        monto: Number(prestamo.monto),
        fecha: prestamo.created_at,
        moneda: "USD",
      })
      toast.success("Recibo descargado")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al generar el PDF"
      toast.error("Error al generar el PDF", { description: message })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total prestado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              USD {totalPrestado.toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de devolución</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendientes}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Listado de préstamos</h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (o) setUbicacionId(defaultUbicacionId)
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar préstamo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddPrestamo}>
              <DialogHeader>
                <DialogTitle>Nuevo préstamo</DialogTitle>
                <DialogDescription>
                  Registra un préstamo de dinero.
                </DialogDescription>
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="monto">Monto (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      USD
                    </span>
                    <Input
                      id="monto"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="200"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>
                </div>
                <UbicacionSelect
                  id="ubicacion-prestamo"
                  value={ubicacionId}
                  onValueChange={setUbicacionId}
                  ubicaciones={ubicaciones}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Editar préstamo</DialogTitle>
                <DialogDescription>Corrige nombre o monto si se registraron mal.</DialogDescription>
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-monto">Monto (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      USD
                    </span>
                    <Input
                      id="edit-monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editMonto}
                      onChange={(e) => setEditMonto(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>
                </div>
                <UbicacionSelect
                  id="ubicacion-prestamo-edit"
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
              <AlertDialogTitle>Eliminar préstamo</AlertDialogTitle>
              <AlertDialogDescription>
                {prestamoToDelete ? (
                  <>
                    Se eliminara el préstamo de <strong>{prestamoToDelete.nombre_apellido}</strong> por USD{" "}
                    {Number(prestamoToDelete.monto).toLocaleString("es-AR")}. Esta accion no se puede deshacer.
                  </>
                ) : (
                  "Esta accion no se puede deshacer."
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
          {prestamos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Banknote className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">No hay préstamos registrados</p>
              <p className="text-sm text-muted-foreground/70">Agrega el primero con el botón de arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">N.&deg;</TableHead>
                    <TableHead>Nombre y Apellido</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-28 text-right">Recibo</TableHead>
                    <TableHead className="w-[10rem] text-center">Devuelto</TableHead>
                    <TableHead className="w-28 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestamos.map((prestamo, index) => {
                    const date = new Date(prestamo.created_at)
                    const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
                    return (
                      <TableRow key={prestamo.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {String(prestamos.length - index).padStart(4, "0")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{prestamo.nombre_apellido}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {prestamo.ubicacion_nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          USD {Number(prestamo.monto).toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(prestamo, index)}
                            className="text-primary hover:text-primary/80"
                          >
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={prestamo.devuelto}
                            onCheckedChange={(checked) =>
                              handleToggleDevuelto(prestamo.id, checked === true)
                            }
                            disabled={togglingId === prestamo.id}
                            title="Ya se devolvió el dinero"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(prestamo)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(prestamo)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
  )
}
