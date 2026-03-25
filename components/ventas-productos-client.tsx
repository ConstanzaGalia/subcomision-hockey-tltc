"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Package } from "lucide-react"
import {
  deleteProducto,
  deleteProductoVenta,
  updateProducto,
  updateProductoVenta,
} from "@/app/dashboard/ventas-productos/actions"
import { UbicacionSelect } from "@/components/ubicacion-select"
import type { UbicacionOption } from "@/lib/ubicaciones"

type Moneda = "ARS" | "USD"
type MetodoPago = "EFECTIVO" | "TRANSFERENCIA"

export type ProductoRow = {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  moneda: Moneda
  activo: boolean
  user_id: string
  created_at: string
}

export type VentaProductoRow = {
  id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  total: number
  fecha: string
  metodo_pago: MetodoPago
  user_id: string
  created_at: string
  ubicacion_id: string
  ubicacion_nombre?: string | null
  producto_nombre: string
  producto_moneda: Moneda | null
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function moneyLabel(moneda: Moneda, monto: number): string {
  const prefix = moneda === "ARS" ? "ARS" : "USD"
  return `${prefix} ${Number(monto).toLocaleString("es-AR")}`
}

function metodoPagoLabel(m: MetodoPago): string {
  return m === "EFECTIVO" ? "Efectivo" : "Transferencia"
}

function formatFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-")
  if (!y || !m || !d) return fechaISO
  return `${d}/${m}/${y}`
}

function todayISODate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function VentasProductosClient({
  initialProductos,
  initialVentas,
  ubicaciones,
  defaultUbicacionId,
}: {
  initialProductos: ProductoRow[]
  initialVentas: VentaProductoRow[]
  ubicaciones: UbicacionOption[]
  defaultUbicacionId: string
}) {
  const [productos, setProductos] = useState<ProductoRow[]>(initialProductos)
  const [ventas, setVentas] = useState<VentaProductoRow[]>(initialVentas)
  const router = useRouter()

  const productosActivos = useMemo(() => productos.filter((p) => p.activo), [productos])

  // --- Productos: crear ---
  const [openProd, setOpenProd] = useState(false)
  const [pNombre, setPNombre] = useState("")
  const [pDesc, setPDesc] = useState("")
  const [pMoneda, setPMoneda] = useState<Moneda>("ARS")
  const [pPrecio, setPPrecio] = useState("")
  const [pActivo, setPActivo] = useState(true)
  const [creatingProd, setCreatingProd] = useState(false)

  // --- Productos: editar ---
  const [openEditProd, setOpenEditProd] = useState(false)
  const [editingProd, setEditingProd] = useState<ProductoRow | null>(null)
  const [eNombre, setENombre] = useState("")
  const [eDesc, setEDesc] = useState("")
  const [eMoneda, setEMoneda] = useState<Moneda>("ARS")
  const [ePrecio, setEPrecio] = useState("")
  const [eActivo, setEActivo] = useState(true)
  const [savingProd, setSavingProd] = useState(false)

  const [openDelProd, setOpenDelProd] = useState(false)
  const [prodToDelete, setProdToDelete] = useState<ProductoRow | null>(null)
  const [deletingProd, setDeletingProd] = useState(false)

  // --- Ventas: crear ---
  const [openVenta, setOpenVenta] = useState(false)
  const [vProductoId, setVProductoId] = useState<string>("")
  const [vCantidad, setVCantidad] = useState("1")
  const [vPrecioUnit, setVPrecioUnit] = useState("")
  const [vFecha, setVFecha] = useState(todayISODate())
  const [vMetodoPago, setVMetodoPago] = useState<MetodoPago>("EFECTIVO")
  const [vUbicacionId, setVUbicacionId] = useState(defaultUbicacionId)
  const [creatingVenta, setCreatingVenta] = useState(false)

  // --- Ventas: editar ---
  const [openEditVenta, setOpenEditVenta] = useState(false)
  const [editingVenta, setEditingVenta] = useState<VentaProductoRow | null>(null)
  const [evProductoId, setEvProductoId] = useState("")
  const [evCantidad, setEvCantidad] = useState("1")
  const [evPrecioUnit, setEvPrecioUnit] = useState("")
  const [evFecha, setEvFecha] = useState(todayISODate())
  const [evMetodoPago, setEvMetodoPago] = useState<MetodoPago>("EFECTIVO")
  const [evUbicacionId, setEvUbicacionId] = useState("")
  const [savingVenta, setSavingVenta] = useState(false)

  const [openDelVenta, setOpenDelVenta] = useState(false)
  const [ventaToDelete, setVentaToDelete] = useState<VentaProductoRow | null>(null)
  const [deletingVenta, setDeletingVenta] = useState(false)

  const ventaPreviewTotal = useMemo(() => {
    const c = Number.parseInt(vCantidad, 10)
    const u = Number.parseFloat(vPrecioUnit)
    if (!Number.isFinite(c) || c < 1 || !Number.isFinite(u) || u < 0) return null
    return roundMoney(c * u)
  }, [vCantidad, vPrecioUnit])

  async function handleCreateProducto(e: React.FormEvent) {
    e.preventDefault()
    const precio = Number.parseFloat(pPrecio)
    if (!pNombre.trim()) {
      toast.error("Ingresá el nombre del producto")
      return
    }
    if (Number.isNaN(precio) || precio < 0) {
      toast.error("Ingresá un precio válido")
      return
    }

    setCreatingProd(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("No estás autenticado")
      setCreatingProd(false)
      return
    }

    const { data, error } = await supabase
      .from("productos")
      .insert({
        nombre: pNombre.trim(),
        descripcion: pDesc.trim() ? pDesc.trim() : null,
        precio,
        moneda: pMoneda,
        activo: pActivo,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al guardar", { description: error.message })
      setCreatingProd(false)
      return
    }

    setProductos((prev) => [...prev, data as ProductoRow].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setOpenProd(false)
    setPNombre("")
    setPDesc("")
    setPMoneda("ARS")
    setPPrecio("")
    setPActivo(true)
    setCreatingProd(false)
    toast.success("Producto creado")
    router.refresh()
  }

  function openEditProducto(p: ProductoRow) {
    setEditingProd(p)
    setENombre(p.nombre)
    setEDesc(p.descripcion ?? "")
    setEMoneda(p.moneda)
    setEPrecio(String(p.precio))
    setEActivo(p.activo)
    setOpenEditProd(true)
  }

  async function handleSaveProducto(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProd) return
    const precio = Number.parseFloat(ePrecio)
    if (!eNombre.trim()) {
      toast.error("Ingresá el nombre")
      return
    }
    if (Number.isNaN(precio) || precio < 0) {
      toast.error("Ingresá un precio válido")
      return
    }

    setSavingProd(true)
    const result = await updateProducto(editingProd.id, {
      nombre: eNombre.trim(),
      descripcion: eDesc.trim() ? eDesc.trim() : null,
      precio,
      moneda: eMoneda,
      activo: eActivo,
    })
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingProd(false)
      return
    }

    setProductos((prev) =>
      prev
        .map((x) =>
          x.id === editingProd.id
            ? {
                ...x,
                nombre: eNombre.trim(),
                descripcion: eDesc.trim() ? eDesc.trim() : null,
                precio,
                moneda: eMoneda,
                activo: eActivo,
              }
            : x
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
    setOpenEditProd(false)
    setEditingProd(null)
    setSavingProd(false)
    toast.success("Producto actualizado")
    router.refresh()
  }

  function openDeleteProducto(p: ProductoRow) {
    setProdToDelete(p)
    setOpenDelProd(true)
  }

  async function handleConfirmDeleteProducto() {
    if (!prodToDelete) return
    setDeletingProd(true)
    const result = await deleteProducto(prodToDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeletingProd(false)
      setOpenDelProd(false)
      return
    }
    setProductos((prev) => prev.filter((x) => x.id !== prodToDelete.id))
    setVentas((prev) => prev.filter((v) => v.producto_id !== prodToDelete.id))
    setOpenDelProd(false)
    setProdToDelete(null)
    setDeletingProd(false)
    toast.success("Producto eliminado")
    router.refresh()
  }

  function onOpenVentaDialog(openState: boolean) {
    setOpenVenta(openState)
    if (openState && productosActivos.length > 0) {
      const first = productosActivos[0]
      setVProductoId(first.id)
      setVPrecioUnit(String(first.precio))
      setVCantidad("1")
      setVFecha(todayISODate())
      setVMetodoPago("EFECTIVO")
      setVUbicacionId(defaultUbicacionId)
    }
  }

  function onVentaProductoChange(id: string) {
    setVProductoId(id)
    const p = productos.find((x) => x.id === id)
    if (p) setVPrecioUnit(String(p.precio))
  }

  async function handleCreateVenta(e: React.FormEvent) {
    e.preventDefault()
    const cantidad = Number.parseInt(vCantidad, 10)
    const precioUnit = Number.parseFloat(vPrecioUnit)
    if (!vProductoId) {
      toast.error("Seleccioná un producto")
      return
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      toast.error("Ingresá una cantidad válida")
      return
    }
    if (!Number.isFinite(precioUnit) || precioUnit < 0) {
      toast.error("Ingresá un precio unitario válido")
      return
    }
    const total = roundMoney(cantidad * precioUnit)

    setCreatingVenta(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("No estás autenticado")
      setCreatingVenta(false)
      return
    }

    if (!vUbicacionId) {
      toast.error("Seleccioná una ubicación")
      setCreatingVenta(false)
      return
    }

    const { data, error } = await supabase
      .from("producto_ventas")
      .insert({
        producto_id: vProductoId,
        cantidad,
        precio_unitario: precioUnit,
        total,
        fecha: vFecha,
        metodo_pago: vMetodoPago,
        user_id: user.id,
        ubicacion_id: vUbicacionId,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al registrar la venta", { description: error.message })
      setCreatingVenta(false)
      return
    }

    const prod = productos.find((x) => x.id === vProductoId)
    const ubNombre = ubicaciones.find((u) => u.id === vUbicacionId)?.nombre ?? null
    const d = data as {
      id: string
      producto_id: string
      cantidad: number
      precio_unitario: number
      total: number
      fecha: string
      metodo_pago: MetodoPago
      user_id: string
      created_at: string
      ubicacion_id: string
    }
    const row: VentaProductoRow = {
      id: d.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      total: d.total,
      fecha: d.fecha,
      metodo_pago: d.metodo_pago,
      user_id: d.user_id,
      created_at: d.created_at,
      ubicacion_id: d.ubicacion_id,
      ubicacion_nombre: ubNombre,
      producto_nombre: prod?.nombre ?? "—",
      producto_moneda: prod?.moneda ?? null,
    }
    setVentas((prev) => [row, ...prev])
    setOpenVenta(false)
    setCreatingVenta(false)
    toast.success("Venta registrada")
    router.refresh()
  }

  function beginEditVenta(v: VentaProductoRow) {
    setEditingVenta(v)
    setEvProductoId(v.producto_id)
    setEvCantidad(String(v.cantidad))
    setEvPrecioUnit(String(v.precio_unitario))
    setEvFecha(v.fecha)
    setEvMetodoPago(v.metodo_pago)
    setEvUbicacionId(v.ubicacion_id || defaultUbicacionId)
    setOpenEditVenta(true)
  }

  async function handleSaveVenta(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenta) return
    const cantidad = Number.parseInt(evCantidad, 10)
    const precioUnit = Number.parseFloat(evPrecioUnit)
    if (!evProductoId) {
      toast.error("Seleccioná un producto")
      return
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      toast.error("Ingresá una cantidad válida")
      return
    }
    if (!Number.isFinite(precioUnit) || precioUnit < 0) {
      toast.error("Ingresá un precio unitario válido")
      return
    }
    const total = roundMoney(cantidad * precioUnit)

    if (!evUbicacionId) {
      toast.error("Seleccioná una ubicación")
      return
    }

    setSavingVenta(true)
    const result = await updateProductoVenta(editingVenta.id, {
      producto_id: evProductoId,
      cantidad,
      precio_unitario: precioUnit,
      total,
      fecha: evFecha,
      metodo_pago: evMetodoPago,
      ubicacion_id: evUbicacionId,
    })
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingVenta(false)
      return
    }

    const prod = productos.find((x) => x.id === evProductoId)
    const ubNombre = ubicaciones.find((u) => u.id === evUbicacionId)?.nombre ?? null
    setVentas((prev) =>
      prev.map((x) =>
        x.id === editingVenta.id
          ? {
              ...x,
              producto_id: evProductoId,
              cantidad,
              precio_unitario: precioUnit,
              total,
              fecha: evFecha,
              metodo_pago: evMetodoPago,
              ubicacion_id: evUbicacionId,
              ubicacion_nombre: ubNombre,
              producto_nombre: prod?.nombre ?? x.producto_nombre,
              producto_moneda: prod?.moneda ?? x.producto_moneda,
            }
          : x
      )
    )
    setOpenEditVenta(false)
    setEditingVenta(null)
    setSavingVenta(false)
    toast.success("Venta actualizada")
    router.refresh()
  }

  function openDeleteVenta(v: VentaProductoRow) {
    setVentaToDelete(v)
    setOpenDelVenta(true)
  }

  async function handleConfirmDeleteVenta() {
    if (!ventaToDelete) return
    setDeletingVenta(true)
    const result = await deleteProductoVenta(ventaToDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeletingVenta(false)
      setOpenDelVenta(false)
      return
    }
    setVentas((prev) => prev.filter((x) => x.id !== ventaToDelete.id))
    setOpenDelVenta(false)
    setVentaToDelete(null)
    setDeletingVenta(false)
    toast.success("Venta eliminada")
    router.refresh()
  }

  return (
    <Tabs defaultValue="productos" className="w-full">
      <TabsList>
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="ventas">Ventas</TabsTrigger>
      </TabsList>

      <TabsContent value="productos" className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Catálogo</h2>
          <Dialog open={openProd} onOpenChange={setOpenProd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateProducto}>
                <DialogHeader>
                  <DialogTitle>Nuevo producto</DialogTitle>
                  <DialogDescription>Definí nombre, precio y moneda.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-nombre">Nombre</Label>
                    <Input
                      id="p-nombre"
                      value={pNombre}
                      onChange={(e) => setPNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="p-desc">Descripción (opcional)</Label>
                    <Input id="p-desc" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Moneda</Label>
                      <Select value={pMoneda} onValueChange={(v) => setPMoneda(v as Moneda)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">ARS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="p-precio">Precio</Label>
                      <Input
                        id="p-precio"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pPrecio}
                        onChange={(e) => setPPrecio(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="p-activo" checked={pActivo} onCheckedChange={(c) => setPActivo(c === true)} />
                    <Label htmlFor="p-activo" className="font-normal">
                      Activo (visible para ventas)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenProd(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingProd}>
                    {creatingProd ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">No hay productos</p>
                <p className="text-sm text-muted-foreground/70">Creá el primero con el botón de arriba.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-28 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-foreground">{p.nombre}</TableCell>
                        <TableCell>{moneyLabel(p.moneda, Number(p.precio))}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.activo ? "Activo" : "Inactivo"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[14rem] truncate">
                          {p.descripcion?.trim() ? p.descripcion : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditProducto(p)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => openDeleteProducto(p)}
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

        <Dialog open={openEditProd} onOpenChange={setOpenEditProd}>
          <DialogContent>
            <form onSubmit={handleSaveProducto}>
              <DialogHeader>
                <DialogTitle>Editar producto</DialogTitle>
                <DialogDescription>Modificá datos del producto.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-nombre">Nombre</Label>
                  <Input id="e-nombre" value={eNombre} onChange={(e) => setENombre(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-desc">Descripción (opcional)</Label>
                  <Input id="e-desc" value={eDesc} onChange={(e) => setEDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Moneda</Label>
                    <Select value={eMoneda} onValueChange={(v) => setEMoneda(v as Moneda)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="e-precio">Precio</Label>
                    <Input
                      id="e-precio"
                      type="number"
                      min="0"
                      step="0.01"
                      value={ePrecio}
                      onChange={(e) => setEPrecio(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="e-activo" checked={eActivo} onCheckedChange={(c) => setEActivo(c === true)} />
                  <Label htmlFor="e-activo" className="font-normal">
                    Activo
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEditProd(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingProd}>
                  {savingProd ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={openDelProd} onOpenChange={setOpenDelProd}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
              <AlertDialogDescription>
                {prodToDelete ? (
                  <>
                    Se eliminará <strong>{prodToDelete.nombre}</strong>. Si tiene ventas registradas, la base puede
                    rechazar la eliminación.
                  </>
                ) : (
                  "Esta acción no se puede deshacer."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingProd}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void handleConfirmDeleteProducto()
                }}
                disabled={deletingProd}
                className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
              >
                {deletingProd ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>

      <TabsContent value="ventas" className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Ventas registradas</h2>
          <Dialog open={openVenta} onOpenChange={onOpenVentaDialog}>
            <DialogTrigger asChild>
              <Button disabled={productosActivos.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar venta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateVenta}>
                <DialogHeader>
                  <DialogTitle>Nueva venta</DialogTitle>
                  <DialogDescription>Elegí producto, cantidad y fecha.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label>Producto</Label>
                    <Select value={vProductoId} onValueChange={onVentaProductoChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {productosActivos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} ({p.moneda} {Number(p.precio).toLocaleString("es-AR")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="v-cant">Cantidad</Label>
                      <Input
                        id="v-cant"
                        type="number"
                        min="1"
                        step="1"
                        value={vCantidad}
                        onChange={(e) => setVCantidad(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="v-pu">Precio unitario</Label>
                      <Input
                        id="v-pu"
                        type="number"
                        min="0"
                        step="0.01"
                        value={vPrecioUnit}
                        onChange={(e) => setVPrecioUnit(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="v-fecha">Fecha</Label>
                    <Input id="v-fecha" type="date" value={vFecha} onChange={(e) => setVFecha(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Medio de pago</Label>
                    <Select value={vMetodoPago} onValueChange={(val) => setVMetodoPago(val as MetodoPago)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <UbicacionSelect
                    id="ubicacion-venta-prod"
                    value={vUbicacionId}
                    onValueChange={setVUbicacionId}
                    ubicaciones={ubicaciones}
                  />
                  {ventaPreviewTotal != null && vProductoId && (
                    <p className="text-sm text-muted-foreground">
                      Total:{" "}
                      <span className="font-medium text-foreground">
                        {moneyLabel(
                          productos.find((x) => x.id === vProductoId)?.moneda ?? "ARS",
                          ventaPreviewTotal
                        )}
                      </span>
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenVenta(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingVenta || productosActivos.length === 0}>
                    {creatingVenta ? "Guardando..." : "Guardar venta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {ventas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">No hay ventas</p>
                <p className="text-sm text-muted-foreground/70">Registrá la primera en la pestaña Ventas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>P. unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Medio de pago</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="w-28 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((v) => {
                      const mon = v.producto_moneda ?? "ARS"
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="text-muted-foreground">{formatFecha(v.fecha)}</TableCell>
                          <TableCell className="font-medium text-foreground">{v.producto_nombre}</TableCell>
                          <TableCell>{v.cantidad}</TableCell>
                          <TableCell>{moneyLabel(mon, Number(v.precio_unitario))}</TableCell>
                          <TableCell className="font-medium">{moneyLabel(mon, Number(v.total))}</TableCell>
                          <TableCell className="text-muted-foreground">{metodoPagoLabel(v.metodo_pago)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {v.ubicacion_nombre ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => beginEditVenta(v)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => openDeleteVenta(v)}
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

        <Dialog open={openEditVenta} onOpenChange={setOpenEditVenta}>
          <DialogContent>
            <form onSubmit={handleSaveVenta}>
              <DialogHeader>
                <DialogTitle>Editar venta</DialogTitle>
                <DialogDescription>Corregí producto, cantidad o precio.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label>Producto</Label>
                  <Select value={evProductoId} onValueChange={setEvProductoId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} ({p.activo ? "activo" : "inactivo"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ev-cant">Cantidad</Label>
                    <Input
                      id="ev-cant"
                      type="number"
                      min="1"
                      step="1"
                      value={evCantidad}
                      onChange={(e) => setEvCantidad(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ev-pu">Precio unitario</Label>
                    <Input
                      id="ev-pu"
                      type="number"
                      min="0"
                      step="0.01"
                      value={evPrecioUnit}
                      onChange={(e) => setEvPrecioUnit(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ev-fecha">Fecha</Label>
                  <Input id="ev-fecha" type="date" value={evFecha} onChange={(e) => setEvFecha(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Medio de pago</Label>
                  <Select value={evMetodoPago} onValueChange={(val) => setEvMetodoPago(val as MetodoPago)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <UbicacionSelect
                  id="ubicacion-venta-prod-edit"
                  value={evUbicacionId}
                  onValueChange={setEvUbicacionId}
                  ubicaciones={ubicaciones}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEditVenta(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingVenta}>
                  {savingVenta ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={openDelVenta} onOpenChange={setOpenDelVenta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
              <AlertDialogDescription>
                {ventaToDelete ? (
                  <>
                    Se eliminará la venta de <strong>{ventaToDelete.producto_nombre}</strong> del{" "}
                    <strong>{formatFecha(ventaToDelete.fecha)}</strong>.
                  </>
                ) : (
                  "Esta acción no se puede deshacer."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingVenta}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void handleConfirmDeleteVenta()
                }}
                disabled={deletingVenta}
                className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
              >
                {deletingVenta ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>
    </Tabs>
  )
}
