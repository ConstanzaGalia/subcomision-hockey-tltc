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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Banknote, DollarSign, Ticket } from "lucide-react"
import {
  deleteRifa,
  deleteRifaCampana,
  deleteRifaPago,
  toggleRifaEntregado,
  updateRifa,
  updateRifaCampana,
} from "@/app/dashboard/rifas/actions"
import { UbicacionSelect } from "@/components/ubicacion-select"
import type { UbicacionOption } from "@/lib/ubicaciones"
import { cn } from "@/lib/utils"

type Moneda = "USD" | "ARS"

export type RifaCampanaRow = {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  cuenta_para_cancha: boolean
  created_at: string
  user_id: string
}

export type RifaPagoRow = {
  id: string
  monto: number
  fecha: string
  nota: string | null
  created_at?: string
}

export type RifaRow = {
  id: string
  campana_id: string
  nombre_apellido: string
  cantidad: number
  entregado: boolean
  moneda: Moneda
  ubicacion_id: string
  ubicacion_nombre?: string | null
  fecha: string
  created_at: string
  user_id: string
  pagos: RifaPagoRow[]
  rendimiento: number
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

export function RifasClient({
  initialCampanas,
  initialRifas,
  ubicaciones,
  defaultUbicacionId,
}: {
  initialCampanas: RifaCampanaRow[]
  initialRifas: RifaRow[]
  ubicaciones: UbicacionOption[]
  defaultUbicacionId: string
}) {
  const [campanas, setCampanas] = useState<RifaCampanaRow[]>(initialCampanas)
  const [rifas, setRifas] = useState<RifaRow[]>(initialRifas)
  const [selectedCampanaId, setSelectedCampanaId] = useState<string>(
    initialCampanas[0]?.id ?? "",
  )
  const router = useRouter()

  const selectedCampana = campanas.find((c) => c.id === selectedCampanaId) ?? null
  const rifasDeCampana = useMemo(
    () => rifas.filter((r) => r.campana_id === selectedCampanaId),
    [rifas, selectedCampanaId],
  )

  const [openCreateCampana, setOpenCreateCampana] = useState(false)
  const [campanaNombre, setCampanaNombre] = useState("")
  const [campanaDesc, setCampanaDesc] = useState("")
  const [campanaCuentaCancha, setCampanaCuentaCancha] = useState(true)
  const [creatingCampana, setCreatingCampana] = useState(false)

  const [openEditCampana, setOpenEditCampana] = useState(false)
  const [editCampanaNombre, setEditCampanaNombre] = useState("")
  const [editCampanaDesc, setEditCampanaDesc] = useState("")
  const [editCampanaActiva, setEditCampanaActiva] = useState(true)
  const [editCampanaCuentaCancha, setEditCampanaCuentaCancha] = useState(true)
  const [savingCampana, setSavingCampana] = useState(false)

  const [openDeleteCampana, setOpenDeleteCampana] = useState(false)
  const [deletingCampana, setDeletingCampana] = useState(false)

  const [openCreate, setOpenCreate] = useState(false)
  const [nombre, setNombre] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [moneda, setMoneda] = useState<Moneda>("ARS")
  const [fecha, setFecha] = useState(todayISODate())
  const [ubicacionId, setUbicacionId] = useState(defaultUbicacionId)
  const [entregado, setEntregado] = useState(false)
  const [creating, setCreating] = useState(false)

  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<RifaRow | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editCantidad, setEditCantidad] = useState("")
  const [editMoneda, setEditMoneda] = useState<Moneda>("ARS")
  const [editFecha, setEditFecha] = useState(todayISODate())
  const [editUbicacionId, setEditUbicacionId] = useState("")
  const [editEntregado, setEditEntregado] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const [openDelete, setOpenDelete] = useState(false)
  const [toDelete, setToDelete] = useState<RifaRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [openPagos, setOpenPagos] = useState(false)
  const [pagosRifa, setPagosRifa] = useState<RifaRow | null>(null)
  const [pagoMonto, setPagoMonto] = useState("")
  const [pagoFecha, setPagoFecha] = useState(todayISODate())
  const [pagoNota, setPagoNota] = useState("")
  const [savingPago, setSavingPago] = useState(false)

  const totals = useMemo(() => {
    let usd = 0
    let ars = 0
    let rifasCount = 0
    for (const r of rifasDeCampana) {
      rifasCount += Number(r.cantidad) || 0
      const value = Number(r.rendimiento) || 0
      if (r.moneda === "USD") usd += value
      if (r.moneda === "ARS") ars += value
    }
    return { usd, ars, rifasCount }
  }, [rifasDeCampana])

  async function handleCreateCampana(e: React.FormEvent) {
    e.preventDefault()
    if (!campanaNombre.trim()) {
      toast.error("Ingresá un nombre para la rifa")
      return
    }
    setCreatingCampana(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("No estás autenticado")
      setCreatingCampana(false)
      return
    }

    const { data, error } = await supabase
      .from("rifas_campanas")
      .insert({
        nombre: campanaNombre.trim(),
        descripcion: campanaDesc.trim() ? campanaDesc.trim() : null,
        activa: true,
        cuenta_para_cancha: campanaCuentaCancha,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al crear la rifa", { description: error.message })
      setCreatingCampana(false)
      return
    }

    const campana = data as RifaCampanaRow
    setCampanas((prev) => [campana, ...prev])
    setSelectedCampanaId(campana.id)
    setOpenCreateCampana(false)
    setCampanaNombre("")
    setCampanaDesc("")
    setCampanaCuentaCancha(true)
    setCreatingCampana(false)
    toast.success("Rifa creada")
    router.refresh()
  }

  function openEditCampanaDialog() {
    if (!selectedCampana) return
    setEditCampanaNombre(selectedCampana.nombre)
    setEditCampanaDesc(selectedCampana.descripcion ?? "")
    setEditCampanaActiva(selectedCampana.activa)
    setEditCampanaCuentaCancha(selectedCampana.cuenta_para_cancha ?? true)
    setOpenEditCampana(true)
  }

  async function handleSaveCampana(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCampana) return
    if (!editCampanaNombre.trim()) {
      toast.error("Ingresá un nombre")
      return
    }
    setSavingCampana(true)
    const result = await updateRifaCampana(selectedCampana.id, {
      nombre: editCampanaNombre.trim(),
      descripcion: editCampanaDesc.trim() ? editCampanaDesc.trim() : null,
      activa: editCampanaActiva,
      cuenta_para_cancha: editCampanaCuentaCancha,
    })
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingCampana(false)
      return
    }
    setCampanas((prev) =>
      prev.map((c) =>
        c.id === selectedCampana.id
          ? {
              ...c,
              nombre: editCampanaNombre.trim(),
              descripcion: editCampanaDesc.trim() ? editCampanaDesc.trim() : null,
              activa: editCampanaActiva,
              cuenta_para_cancha: editCampanaCuentaCancha,
            }
          : c,
      ),
    )
    setOpenEditCampana(false)
    setSavingCampana(false)
    toast.success("Rifa actualizada")
    router.refresh()
  }

  async function handleDeleteCampana() {
    if (!selectedCampana) return
    setDeletingCampana(true)
    const result = await deleteRifaCampana(selectedCampana.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeletingCampana(false)
      setOpenDeleteCampana(false)
      return
    }
    const next = campanas.filter((c) => c.id !== selectedCampana.id)
    setCampanas(next)
    setRifas((prev) => prev.filter((r) => r.campana_id !== selectedCampana.id))
    setSelectedCampanaId(next[0]?.id ?? "")
    setDeletingCampana(false)
    setOpenDeleteCampana(false)
    toast.success("Rifa eliminada")
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCampanaId) {
      toast.error("Primero creá o seleccioná una rifa")
      return
    }
    const cantidadNum = Number.parseInt(cantidad, 10)
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      toast.error("Ingresá una cantidad válida de números")
      return
    }
    if (!fecha) {
      toast.error("Seleccioná una fecha")
      return
    }
    if (!ubicacionId) {
      toast.error("Seleccioná una ubicación")
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
      .from("rifas")
      .insert({
        campana_id: selectedCampanaId,
        nombre_apellido: nombre.trim(),
        cantidad: cantidadNum,
        moneda,
        fecha,
        entregado,
        ubicacion_id: ubicacionId,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error("Error al guardar", { description: error.message })
      setCreating(false)
      return
    }

    const ubNombre = ubicaciones.find((u) => u.id === ubicacionId)?.nombre ?? null
    setRifas((prev) => [
      {
        ...(data as Omit<RifaRow, "pagos" | "rendimiento" | "ubicacion_nombre">),
        campana_id: selectedCampanaId,
        ubicacion_nombre: ubNombre,
        pagos: [],
        rendimiento: 0,
      },
      ...prev,
    ])

    setOpenCreate(false)
    setNombre("")
    setCantidad("")
    setMoneda("ARS")
    setFecha(todayISODate())
    setUbicacionId(defaultUbicacionId)
    setEntregado(false)
    setCreating(false)
    toast.success("Asignación registrada")
    router.refresh()
  }

  function openEditDialog(r: RifaRow) {
    setEditing(r)
    setEditNombre(r.nombre_apellido)
    setEditCantidad(String(r.cantidad))
    setEditMoneda(r.moneda)
    setEditFecha(r.fecha)
    setEditUbicacionId(r.ubicacion_id || defaultUbicacionId)
    setEditEntregado(r.entregado)
    setOpenEdit(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const cantidadNum = Number.parseInt(editCantidad, 10)
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      toast.error("Ingresá una cantidad válida")
      return
    }
    if (!editFecha || !editUbicacionId) {
      toast.error("Completá fecha y ubicación")
      return
    }

    setSavingEdit(true)
    const result = await updateRifa(editing.id, {
      nombre_apellido: editNombre.trim(),
      cantidad: cantidadNum,
      moneda: editMoneda,
      entregado: editEntregado,
      ubicacion_id: editUbicacionId,
      fecha: editFecha,
      campana_id: editing.campana_id,
    })
    if (!result.ok) {
      toast.error("Error al actualizar", { description: result.error })
      setSavingEdit(false)
      return
    }

    const ubNombre = ubicaciones.find((u) => u.id === editUbicacionId)?.nombre ?? null
    setRifas((prev) =>
      prev.map((x) =>
        x.id === editing.id
          ? {
              ...x,
              nombre_apellido: editNombre.trim(),
              cantidad: cantidadNum,
              moneda: editMoneda,
              entregado: editEntregado,
              ubicacion_id: editUbicacionId,
              ubicacion_nombre: ubNombre,
              fecha: editFecha,
            }
          : x,
      ),
    )
    setOpenEdit(false)
    setEditing(null)
    setSavingEdit(false)
    toast.success("Asignación actualizada")
    router.refresh()
  }

  async function handleToggleEntregado(r: RifaRow, checked: boolean) {
    setRifas((prev) => prev.map((x) => (x.id === r.id ? { ...x, entregado: checked } : x)))
    const result = await toggleRifaEntregado(r.id, checked)
    if (!result.ok) {
      setRifas((prev) => prev.map((x) => (x.id === r.id ? { ...x, entregado: r.entregado } : x)))
      toast.error("No se pudo actualizar entregado", { description: result.error })
      return
    }
    router.refresh()
  }

  function openDeleteDialog(r: RifaRow) {
    setToDelete(r)
    setOpenDelete(true)
  }

  async function handleConfirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const result = await deleteRifa(toDelete.id)
    if (!result.ok) {
      toast.error("Error al eliminar", { description: result.error })
      setDeleting(false)
      setOpenDelete(false)
      return
    }
    setRifas((prev) => prev.filter((x) => x.id !== toDelete.id))
    setDeleting(false)
    setOpenDelete(false)
    setToDelete(null)
    toast.success("Asignación eliminada")
    router.refresh()
  }

  function openPagosDialog(r: RifaRow) {
    setPagosRifa(r)
    setPagoMonto("")
    setPagoFecha(todayISODate())
    setPagoNota("")
    setOpenPagos(true)
  }

  async function handleAddPago(e: React.FormEvent) {
    e.preventDefault()
    if (!pagosRifa) return
    const montoNum = Number.parseFloat(pagoMonto)
    if (Number.isNaN(montoNum) || montoNum < 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (!pagoFecha) {
      toast.error("Seleccioná una fecha")
      return
    }

    setSavingPago(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("No estás autenticado")
      setSavingPago(false)
      return
    }

    const { data, error } = await supabase
      .from("rifas_pagos")
      .insert({
        rifa_id: pagosRifa.id,
        monto: montoNum,
        fecha: pagoFecha,
        nota: pagoNota.trim() ? pagoNota.trim() : null,
        user_id: user.id,
      })
      .select("id, monto, fecha, nota, created_at")
      .single()

    if (error) {
      toast.error("Error al registrar el pago", { description: error.message })
      setSavingPago(false)
      return
    }

    const pago = data as RifaPagoRow
    const applyPagos = (row: RifaRow): RifaRow => {
      const pagos = [pago, ...row.pagos]
      return {
        ...row,
        pagos,
        rendimiento: pagos.reduce((sum, p) => sum + Number(p.monto ?? 0), 0),
      }
    }
    setRifas((prev) => prev.map((x) => (x.id === pagosRifa.id ? applyPagos(x) : x)))
    setPagosRifa((prev) => (prev ? applyPagos(prev) : prev))
    setPagoMonto("")
    setPagoNota("")
    setPagoFecha(todayISODate())
    setSavingPago(false)
    toast.success("Rendimiento registrado")
    router.refresh()
  }

  async function handleDeletePago(pagoId: string) {
    if (!pagosRifa) return
    const result = await deleteRifaPago(pagoId)
    if (!result.ok) {
      toast.error("Error al eliminar el pago", { description: result.error })
      return
    }
    const apply = (row: RifaRow): RifaRow => {
      const pagos = row.pagos.filter((p) => p.id !== pagoId)
      return {
        ...row,
        pagos,
        rendimiento: pagos.reduce((sum, p) => sum + Number(p.monto ?? 0), 0),
      }
    }
    setRifas((prev) => prev.map((x) => (x.id === pagosRifa.id ? apply(x) : x)))
    setPagosRifa((prev) => (prev ? apply(prev) : prev))
    toast.success("Pago eliminado")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="shrink-0 text-sm text-muted-foreground">Rifa</Label>
          {campanas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay rifas creadas.</p>
          ) : (
            <Select value={selectedCampanaId} onValueChange={setSelectedCampanaId}>
              <SelectTrigger className="w-full sm:max-w-sm">
                <SelectValue placeholder="Elegí una rifa" />
              </SelectTrigger>
              <SelectContent>
                {campanas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                    {!c.activa ? " (inactiva)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedCampana ? (
            <>
              <Button variant="outline" size="sm" onClick={openEditCampanaDialog}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar rifa
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setOpenDeleteCampana(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Eliminar
              </Button>
            </>
          ) : null}
          <Dialog open={openCreateCampana} onOpenChange={setOpenCreateCampana}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Nueva rifa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateCampana}>
                <DialogHeader>
                  <DialogTitle>Crear rifa</DialogTitle>
                  <DialogDescription>
                    Por ejemplo “Rifa del auto”. Después vas a poder armar otra cuando haga falta.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="campana-nombre">Nombre</Label>
                    <Input
                      id="campana-nombre"
                      placeholder="Ej: Rifa del auto"
                      value={campanaNombre}
                      onChange={(e) => setCampanaNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="campana-desc">Descripción (opcional)</Label>
                    <Input
                      id="campana-desc"
                      value={campanaDesc}
                      onChange={(e) => setCampanaDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="campana-cuenta-cancha"
                      checked={campanaCuentaCancha}
                      onCheckedChange={(v) => setCampanaCuentaCancha(v === true)}
                    />
                    <Label htmlFor="campana-cuenta-cancha" className="font-normal leading-snug">
                      Cuenta para la cancha
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        El rendimiento de esta rifa suma al avance. Dejálo marcado.
                      </span>
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenCreateCampana(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creatingCampana}>
                    {creatingCampana ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedCampana ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            selectedCampana.cuenta_para_cancha
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          <span className="font-medium">{selectedCampana.nombre}</span>
          {selectedCampana.descripcion ? (
            <span className="text-muted-foreground"> — {selectedCampana.descripcion}</span>
          ) : null}
          <span className="mt-1 block text-xs">
            {(selectedCampana.cuenta_para_cancha ?? true)
              ? "Esta rifa cuenta para la cancha."
              : "Esta rifa no suma al avance de la cancha."}
            {!selectedCampana.activa ? " · Inactiva" : ""}
          </span>
        </div>
      ) : null}

      {!selectedCampanaId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Creá la primera rifa (por ejemplo la del auto) para empezar a asignar números.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Números asignados
                </CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totals.rifasCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rendimiento (USD)
                </CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rendimiento (ARS)
                </CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ARS {totals.ars.toLocaleString("es-AR")}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Asignaciones</h2>
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
                  Asignar números
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Asignar rifas</DialogTitle>
                    <DialogDescription>
                      Persona a la que se le dieron números de {selectedCampana?.nombre}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rifa-nombre">Nombre y apellido</Label>
                      <Input
                        id="rifa-nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="rifa-cantidad">Nº de rifas</Label>
                        <Input
                          id="rifa-cantidad"
                          type="number"
                          min="1"
                          step="1"
                          value={cantidad}
                          onChange={(e) => setCantidad(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Moneda del rendimiento</Label>
                        <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ARS">ARS</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="rifa-fecha">Fecha</Label>
                      <Input
                        id="rifa-fecha"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        required
                      />
                    </div>
                    <UbicacionSelect
                      id="ubicacion-rifa"
                      value={ubicacionId}
                      onValueChange={setUbicacionId}
                      ubicaciones={ubicaciones}
                    />
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="rifa-entregado"
                        checked={entregado}
                        onCheckedChange={(v) => setEntregado(v === true)}
                      />
                      <Label htmlFor="rifa-entregado" className="font-normal leading-snug">
                        Entregado
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Marcá si ya se les dieron las rifas.
                        </span>
                      </Label>
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

          <Card>
            <CardContent className="p-0">
              {rifasDeCampana.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    Nadie tiene números asignados en esta rifa
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Usá “Asignar números” para cargar la primera persona.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Rifas</TableHead>
                        <TableHead>Entregado</TableHead>
                        <TableHead>Rendimiento</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead className="w-36 text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rifasDeCampana.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-foreground">
                            {r.nombre_apellido}
                          </TableCell>
                          <TableCell>{r.cantidad}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={r.entregado}
                              onCheckedChange={(v) => handleToggleEntregado(r, v === true)}
                              aria-label={`Entregado ${r.nombre_apellido}`}
                            />
                          </TableCell>
                          <TableCell className="text-foreground">
                            {moneyLabel(r.moneda, r.rendimiento)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.ubicacion_nombre ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPagosDialog(r)}
                                title="Rendimiento"
                              >
                                <Banknote className="mr-1 h-4 w-4" />
                                Pagar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(r)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => openDeleteDialog(r)}
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
        </>
      )}

      <Dialog open={openEditCampana} onOpenChange={setOpenEditCampana}>
        <DialogContent>
          <form onSubmit={handleSaveCampana}>
            <DialogHeader>
              <DialogTitle>Editar rifa</DialogTitle>
              <DialogDescription>Nombre, estado y si suma a la cancha.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-campana-nombre">Nombre</Label>
                <Input
                  id="edit-campana-nombre"
                  value={editCampanaNombre}
                  onChange={(e) => setEditCampanaNombre(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-campana-desc">Descripción</Label>
                <Input
                  id="edit-campana-desc"
                  value={editCampanaDesc}
                  onChange={(e) => setEditCampanaDesc(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="edit-campana-activa"
                  checked={editCampanaActiva}
                  onCheckedChange={(v) => setEditCampanaActiva(v === true)}
                />
                <Label htmlFor="edit-campana-activa" className="font-normal">
                  Activa
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="edit-campana-cuenta"
                  checked={editCampanaCuentaCancha}
                  onCheckedChange={(v) => setEditCampanaCuentaCancha(v === true)}
                />
                <Label htmlFor="edit-campana-cuenta" className="font-normal leading-snug">
                  Cuenta para la cancha
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditCampana(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCampana}>
                {savingCampana ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle>Editar asignación</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-rifa-nombre">Nombre y apellido</Label>
                <Input
                  id="edit-rifa-nombre"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-rifa-cantidad">Nº de rifas</Label>
                  <Input
                    id="edit-rifa-cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={editCantidad}
                    onChange={(e) => setEditCantidad(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Moneda</Label>
                  <Select value={editMoneda} onValueChange={(v) => setEditMoneda(v as Moneda)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-rifa-fecha">Fecha</Label>
                <Input
                  id="edit-rifa-fecha"
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  required
                />
              </div>
              <UbicacionSelect
                id="ubicacion-rifa-edit"
                value={editUbicacionId}
                onValueChange={setEditUbicacionId}
                ubicaciones={ubicaciones}
              />
              <div className="flex items-start gap-2">
                <Checkbox
                  id="edit-rifa-entregado"
                  checked={editEntregado}
                  onCheckedChange={(v) => setEditEntregado(v === true)}
                />
                <Label htmlFor="edit-rifa-entregado" className="font-normal">
                  Entregado
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openPagos} onOpenChange={setOpenPagos}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rendimiento</DialogTitle>
            <DialogDescription>
              {pagosRifa
                ? `${pagosRifa.nombre_apellido} · ${pagosRifa.cantidad} rifas · acumulado ${moneyLabel(pagosRifa.moneda, pagosRifa.rendimiento)}`
                : "Registrá pagos a medida que rinden las rifas."}
            </DialogDescription>
          </DialogHeader>
          {pagosRifa ? (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleAddPago} className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pago-monto">Monto ({pagosRifa.moneda})</Label>
                    <Input
                      id="pago-monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagoMonto}
                      onChange={(e) => setPagoMonto(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pago-fecha">Fecha</Label>
                    <Input
                      id="pago-fecha"
                      type="date"
                      value={pagoFecha}
                      onChange={(e) => setPagoFecha(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pago-nota">Nota (opcional)</Label>
                  <Input
                    id="pago-nota"
                    value={pagoNota}
                    onChange={(e) => setPagoNota(e.target.value)}
                    placeholder="Ej: 10 rifas vendidas"
                  />
                </div>
                <Button type="submit" disabled={savingPago}>
                  {savingPago ? "Guardando..." : "Agregar pago"}
                </Button>
              </form>

              {pagosRifa.pagos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {pagosRifa.pagos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {moneyLabel(pagosRifa.moneda, Number(p.monto))}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatFecha(p.fecha)}
                          {p.nota ? ` · ${p.nota}` : ""}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => handleDeletePago(p.id)}
                        title="Eliminar pago"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar asignación</AlertDialogTitle>
            <AlertDialogDescription>
              Se elimina a <strong>{toDelete?.nombre_apellido}</strong> y sus pagos de esta rifa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDeleteCampana} onOpenChange={setOpenDeleteCampana}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rifa</AlertDialogTitle>
            <AlertDialogDescription>
              Se elimina <strong>{selectedCampana?.nombre}</strong>, todas las asignaciones y los
              pagos de rendimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCampana}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampana} disabled={deletingCampana}>
              {deletingCampana ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
