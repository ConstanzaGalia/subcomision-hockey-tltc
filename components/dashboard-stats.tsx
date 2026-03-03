"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
import { DollarSign, Target, Pencil } from "lucide-react"
import { toast } from "sonner"
import { updateObjetivoCancha } from "@/app/dashboard/actions"

interface DashboardStatsProps {
  totalRecaudadoCancha: number
  objetivoMonto: number
  canEditObjetivo: boolean
}

export function DashboardStats({
  totalRecaudadoCancha,
  objetivoMonto,
  canEditObjetivo,
}: DashboardStatsProps) {
  const [openEdit, setOpenEdit] = useState(false)
  const [editMonto, setEditMonto] = useState(String(objetivoMonto))
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const porcentajeDelObjetivo =
    objetivoMonto > 0
      ? Math.min(100, Math.round((totalRecaudadoCancha / objetivoMonto) * 100))
      : null

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
    <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total recaudado para cancha 💰
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-row items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">
              USD {totalRecaudadoCancha.toLocaleString("es-AR")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Venta de parcelas + préstamos
            </p>
          </div>
          {porcentajeDelObjetivo !== null && (
            <p className="mt-1 text-sm font-medium text-foreground">
              {porcentajeDelObjetivo}% del objetivo 📈
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Objetivo a alcanzar 🎯
          </CardTitle>
          <div className="flex items-center gap-1">
            {canEditObjetivo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditMonto(String(objetivoMonto))
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
            USD {Number(objetivoMonto).toLocaleString("es-AR")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Meta en USD para la cancha
          </p>
        </CardContent>
      </Card>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <form onSubmit={handleSaveObjetivo}>
            <DialogHeader>
              <DialogTitle>Editar objetivo</DialogTitle>
              <DialogDescription>
                Monto en USD que se debe alcanzar para la cancha.
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
