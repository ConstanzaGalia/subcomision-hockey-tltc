"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { UbicacionOption } from "@/lib/ubicaciones"

export function UbicacionSelect({
  id,
  label = "Ubicación",
  value,
  onValueChange,
  ubicaciones,
  disabled,
}: {
  id?: string
  label?: string
  value: string
  onValueChange: (v: string) => void
  ubicaciones: UbicacionOption[]
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || ubicaciones.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Seleccionar ubicación" />
        </SelectTrigger>
        <SelectContent>
          {ubicaciones.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
