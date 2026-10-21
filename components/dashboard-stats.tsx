"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DollarSign, Handshake, LandPlot, Package, Pencil, Target, Banknote } from "lucide-react"
import { toast } from "sonner"
import { updateObjetivoCancha } from "@/app/dashboard/actions"
import {
  cotizacionLabel,
  formatMoney,
  TOTAL_PARCELAS,
  type CampanaPublica,
} from "@/lib/campana-publica"

interface DashboardStatsProps {
  campana: CampanaPublica
  canEditObjetivo: boolean
}

export function DashboardStats({ campana, canEditObjetivo }: DashboardStatsProps) {
  const [openEdit, setOpenEdit] = useState(false)
  const [editMonto, setEditMonto] = useState(String(campana.objetivoUsd))
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSaveObjetivo(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(editMonto)
    if (Number.isNaN(num) || num < 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    setSaving(true)
    const result = await updateObjetivoCancha(num)
    if (!result.ok) {
      toast.error("Error al guardar", { description: result.error })
      setSaving(false)
      return
    }
    setOpenEdit(false)
    setSaving(false)
    toast.success("Objetivo actualizado")
    router.refresh()
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total recaudado para cancha
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney("USD", campana.totalUsdEquivalente)}
            </div>
            {campana.porcentaje != null && (
              <p className="mt-1 text-sm font-medium text-foreground">
                {campana.porcentaje}% del objetivo
              </p>
            )}
            <Progress value={campana.porcentaje ?? 0} className="mt-3 h-2" />
            {campana.totalArs > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Incluye {formatMoney("ARS", campana.totalArs)} (≈ {formatMoney("USD", campana.arsEnUsd)}{" "}
                al blue)
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{cotizacionLabel(campana)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Objetivo a alcanzar
            </CardTitle>
            <div className="flex items-center gap-1">
              {canEditObjetivo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditMonto(String(campana.objetivoUsd))
                    setOpenEdit(true)
                  }}
                  title="Editar objetivo"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney("USD", campana.objetivoUsd)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Meta en USD para la cancha. Visible también en la landing pública.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <LandPlot className="h-3.5 w-3.5" />
              Parcelas
            </div>
            <div className="mt-1 font-semibold">{formatMoney("USD", campana.parcelasUsd)}</div>
            <p className="text-xs text-muted-foreground">
              {campana.parcelasVendidas} / {TOTAL_PARCELAS}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" />
              Cuota extra
            </div>
            <div className="mt-1 font-semibold">{formatMoney("USD", campana.cuotaUsd)}</div>
            {campana.cuotaArs > 0 && (
              <p className="text-xs text-muted-foreground">{formatMoney("ARS", campana.cuotaArs)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Ventas
            </div>
            <div className="mt-1 font-semibold">{formatMoney("USD", campana.productosUsd)}</div>
            {campana.productosArs > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatMoney("ARS", campana.productosArs)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Handshake className="h-3.5 w-3.5" />
              Préstamos
            </div>
            <div className="mt-1 font-semibold">{formatMoney("USD", campana.prestamosUsd)}</div>
            <p className="text-xs text-muted-foreground">Aportes reintegrables</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <form onSubmit={handleSaveObjetivo}>
            <DialogHeader>
              <DialogTitle>Editar objetivo</DialogTitle>
              <DialogDescription>
                Monto en USD que se debe alcanzar para la cancha. Se muestra en la landing pública.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="objetivo-usd">Objetivo (USD)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    USD
                  </span>
                  <Input
                    id="objetivo-usd"
                    type="number"
                    min="0"
                    step="100"
                    value={editMonto}
                    onChange={(e) => setEditMonto(e.target.value)}
                    className="pl-12"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
