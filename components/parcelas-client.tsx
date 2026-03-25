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
import { Plus, FileDown, DollarSign, Users, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { generateReceipt } from "@/lib/generate-receipt"
import { deleteParcelaVenta, toggleAnotadaEnCancha } from "@/app/dashboard/parcelas/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { UbicacionSelect } from "@/components/ubicacion-select"
import type { UbicacionOption } from "@/lib/ubicaciones"

type ParcelaAsignacion = { parcela_numero: number }

interface Venta {
  id: string
  nombre_apellido: string
  precio: number
  created_at: string
  user_id: string
  ubicacion_id: string
  ubicacion_nombre?: string | null
  anotada_en_cancha?: boolean
  parcelas_asignaciones?: ParcelaAsignacion[] | null
}

export function ParcelasClient({
  initialVentas,
  ubicaciones,
  defaultUbicacionId,
}: {
  initialVentas: Venta[]
  ubicaciones: UbicacionOption[]
  defaultUbicacionId: string
}) {
  const [ventas, setVentas] = useState<Venta[]>(initialVentas)
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [parcelasCsv, setParcelasCsv] = useState("")
  const [ubicacionId, setUbicacionId] = useState(defaultUbicacionId)
  const [loading, setLoading] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editPrecio, setEditPrecio] = useState("")
  const [editParcelasCsv, setEditParcelasCsv] = useState("")
  const [editUbicacionId, setEditUbicacionId] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [ventaToDelete, setVentaToDelete] = useState<Venta | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const router = useRouter()

  function parseParcelasCsv(value: string): number[] {
    const trimmed = value.trim()
    if (!trimmed) return []
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean)
    const nums = parts.map((p) => Number.parseInt(p, 10))
    if (nums.some((n) => !Number.isFinite(n))) return [NaN]
    if (nums.some((n, i) => String(n) !== parts[i])) return [NaN]
    return nums
  }

  function validateParcelas(nums: number[]): string | null {
    if (nums.length === 0) return null
    if (nums.some((n) => Number.isNaN(n))) return "Formato inválido. Usá números separados por coma (ej: 1,2,3)"
    if (nums.some((n) => !Number.isInteger(n))) return "Los números de parcela deben ser enteros"
    if (nums.some((n) => n < 1 || n > 500)) return "Los números de parcela deben estar entre 1 y 500"
    const set = new Set(nums)
    if (set.size !== nums.length) return "No repitas números de parcela en la misma venta"
    return null
  }

  function getParcelasList(venta: Venta): number[] {
    const list = (venta.parcelas_asignaciones ?? [])
      .map((a) => Number(a.parcela_numero))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
    return list
  }

  async function handleToggleAnotada(ventaId: string, checked: boolean) {
    setTogglingId(ventaId)
    const result = await toggleAnotadaEnCancha(ventaId, checked)
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
    } else {
      setVentas((prev) =>
        prev.map((v) => (v.id === ventaId ? { ...v, anotada_en_cancha: checked } : v))
      )
      router.refresh()
    }
    setTogglingId(null)
  }

  const totalRecaudado = ventas.reduce((sum, v) => sum + Number(v.precio), 0)
  const totalParcelasVendidas = ventas.reduce((sum, v) => sum + getParcelasList(v).length, 0)

  async function handleAddVenta(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const parcelasNums = parseParcelasCsv(parcelasCsv)
    const parcelasErr = validateParcelas(parcelasNums)
    if (parcelasErr) {
      toast.error("Parcelas inválidas", { description: parcelasErr })
      setLoading(false)
      return
    }

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

    const { data, error } = await supabase.rpc("create_parcela_venta_with_parcelas", {
      p_nombre_apellido: nombre.trim(),
      p_precio: parseFloat(precio),
      p_parcela_numeros: parcelasNums.length ? parcelasNums : null,
      p_ubicacion_id: ubicacionId,
    })

    if (error) {
      const lowered = error.message.toLowerCase()
      const msg =
        lowered.includes("duplicate") ||
        lowered.includes("unique") ||
        lowered.includes("idx_parcelas_asignaciones_parcela_numero_unique")
          ? "Alguna de esas parcelas ya está asignada a otra venta"
          : error.message
      toast.error("Error al agregar la venta", { description: msg })
      setLoading(false)
      return
    }

    const ventaRow = data as unknown as Venta
    const ubNombre = ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? null
    const enriched: Venta = {
      ...ventaRow,
      ubicacion_nombre: ubNombre,
      parcelas_asignaciones: parcelasNums.map((n) => ({ parcela_numero: n })),
    }
    setVentas([enriched, ...ventas])
    setNombre("")
    setPrecio("")
    setParcelasCsv("")
    setUbicacionId(defaultUbicacionId)
    setOpen(false)
    setLoading(false)
    toast.success("Venta registrada exitosamente")
    router.refresh()
  }

  async function handleDownloadReceipt(venta: Venta, index: number) {
    const receiptNumber = ventas.length - index
    await generateReceipt({
      receiptNumber,
      nombreApellido: venta.nombre_apellido,
      precio: Number(venta.precio),
      fecha: venta.created_at,
    })
    toast.success("Recibo descargado")
  }

  function openEditDialog(venta: Venta) {
    setEditingVenta(venta)
    setEditNombre(venta.nombre_apellido)
    setEditPrecio(String(venta.precio))
    setEditParcelasCsv(getParcelasList(venta).join(","))
    setEditUbicacionId(venta.ubicacion_id || defaultUbicacionId)
    setOpenEdit(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenta) return
    setSavingEdit(true)

    const parcelasNums = parseParcelasCsv(editParcelasCsv)
    const parcelasErr = validateParcelas(parcelasNums)
    if (parcelasErr) {
      toast.error("Parcelas inválidas", { description: parcelasErr })
      setSavingEdit(false)
      return
    }

    if (!editUbicacionId) {
      toast.error("Seleccioná una ubicación")
      setSavingEdit(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.rpc("update_parcela_venta_with_parcelas", {
      p_venta_id: editingVenta.id,
      p_nombre_apellido: editNombre.trim(),
      p_precio: parseFloat(editPrecio),
      p_parcela_numeros: parcelasNums.length ? parcelasNums : null,
      p_ubicacion_id: editUbicacionId,
    })
    if (error) {
      const lowered = error.message.toLowerCase()
      const msg =
        lowered.includes("duplicate") ||
        lowered.includes("unique") ||
        lowered.includes("idx_parcelas_asignaciones_parcela_numero_unique")
          ? "Alguna de esas parcelas ya está asignada a otra venta"
          : error.message
      toast.error("Error al actualizar la venta", { description: msg })
      setSavingEdit(false)
      return
    }

    const ubNombre = ubicaciones.find((u) => u.id === editUbicacionId)?.nombre ?? null
    setVentas((prev) =>
      prev.map((v) =>
        v.id === editingVenta.id
          ? {
              ...v,
              nombre_apellido: editNombre.trim(),
              precio: parseFloat(editPrecio),
              ubicacion_id: editUbicacionId,
              ubicacion_nombre: ubNombre,
              parcelas_asignaciones: parcelasNums.map((n) => ({ parcela_numero: n })),
            }
          : v
      )
    )
    setOpenEdit(false)
    setEditingVenta(null)
    setSavingEdit(false)
    toast.success("Venta actualizada correctamente")
    router.refresh()
  }

  function openDeleteDialog(venta: Venta) {
    setVentaToDelete(venta)
    setOpenDelete(true)
  }

  async function handleConfirmDelete() {
    if (!ventaToDelete) return
    setDeleting(true)
    const result = await deleteParcelaVenta(ventaToDelete.id)

    if (!result.ok) {
      toast.error("Error al eliminar la venta", { description: result.error })
      setDeleting(false)
      setOpenDelete(false)
      setVentaToDelete(null)
      return
    }
    setVentas((prev) => prev.filter((v) => v.id !== ventaToDelete.id))
    setOpenDelete(false)
    setVentaToDelete(null)
    setDeleting(false)
    toast.success("Venta eliminada")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recaudado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">USD {totalRecaudado.toLocaleString("es-AR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parcelas Vendidas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalParcelasVendidas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Listado de Ventas</h2>
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
              Agregar Venta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddVenta}>
              <DialogHeader>
                <DialogTitle>Nueva Venta de Parcela</DialogTitle>
                <DialogDescription>
                  Registra una nueva venta de parcela para la cancha de hockey.
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
                  <Label htmlFor="precio">Precio (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      USD
                    </span>
                    <Input
                      id="precio"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="200"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="parcela-numero">Número de parcela (1-500)</Label>
                  <Input
                    id="parcela-numero"
                    placeholder="Ej: 1,2,3,4,5"
                    value={parcelasCsv}
                    onChange={(e) => setParcelasCsv(e.target.value)}
                  />
                </div>
                <UbicacionSelect
                  id="ubicacion-parcela"
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
                  {loading ? "Guardando..." : "Guardar Venta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Editar venta</DialogTitle>
                <DialogDescription>
                  Corrige el nombre o el precio si se registraron mal.
                </DialogDescription>
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
                  <Label htmlFor="edit-precio">Precio (USD)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      USD
                    </span>
                    <Input
                      id="edit-precio"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="200"
                      value={editPrecio}
                      onChange={(e) => setEditPrecio(e.target.value)}
                      className="pl-12"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-parcela-numero">Números de parcelas (1-500)</Label>
                  <Input
                    id="edit-parcela-numero"
                    placeholder="Ej: 1,2,3,4,5"
                    value={editParcelasCsv}
                    onChange={(e) => setEditParcelasCsv(e.target.value)}
                  />
                </div>
                <UbicacionSelect
                  id="ubicacion-parcela-edit"
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

        {/* Delete confirmation */}
        <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
              <AlertDialogDescription>
                {ventaToDelete ? (
                  <>
                    Se eliminara la venta de <strong>{ventaToDelete.nombre_apellido}</strong> por USD{" "}
                    {Number(ventaToDelete.precio).toLocaleString("es-AR")}. Esta accion no se puede deshacer.
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {ventas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-medium text-muted-foreground">No hay ventas registradas</p>
              <p className="text-sm text-muted-foreground/70">Agrega la primera venta de parcela usando el boton de arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">N.&deg;</TableHead>
                    <TableHead className="w-28">Parcela #</TableHead>
                    <TableHead>Nombre y Apellido</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-[10rem] text-center">Anotada en cancha</TableHead>
                    <TableHead className="w-24 text-right">Recibo</TableHead>
                    <TableHead className="w-28 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta, index) => {
                    const date = new Date(venta.created_at)
                    const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
                    return (
                      <TableRow key={venta.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {String(ventas.length - index).padStart(4, "0")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(() => {
                            const list = getParcelasList(venta)
                            if (list.length === 0) return "—"
                            const shown = list.slice(0, 6).map((n) => String(n).padStart(3, "0")).join(", ")
                            const more = list.length > 6 ? ` +${list.length - 6}` : ""
                            return `${shown}${more}`
                          })()}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{venta.nombre_apellido}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {venta.ubicacion_nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-foreground">USD {Number(venta.precio).toLocaleString("es-AR")}</TableCell>
                        <TableCell className="text-muted-foreground">{formattedDate}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={venta.anotada_en_cancha ?? false}
                            onCheckedChange={(checked) =>
                              handleToggleAnotada(venta.id, checked === true)
                            }
                            disabled={togglingId === venta.id}
                            title="Anotada en la cancha"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(venta, index)}
                            className="text-primary hover:text-primary/80"
                          >
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(venta)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:font-bold"
                              onClick={() => openDeleteDialog(venta)}
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
