"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDni } from "@/lib/categorias"
import type { JugadoraOption } from "@/lib/jugadoras"

export function labelJugadora(j: JugadoraOption): string {
  return `${j.apellido}, ${j.nombre} · DNI ${formatDni(j.dni)}`
}

export function JugadoraSelect({
  id = "jugadora",
  label = "Jugadora",
  value,
  onChange,
  jugadoras,
  disabled,
  optional = true,
}: {
  id?: string
  label?: string
  value: string | null
  onChange: (next: { id: string | null; nombreCompleto: string | null }) => void
  jugadoras: JugadoraOption[]
  disabled?: boolean
  optional?: boolean
}) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => (value ? jugadoras.find((j) => j.id === value) ?? null : null),
    [jugadoras, value],
  )

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || jugadoras.length === 0}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">
                {selected
                  ? labelJugadora(selected)
                  : jugadoras.length === 0
                    ? "No hay jugadoras cargadas"
                    : "Buscar por apellido o DNI…"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Apellido, nombre o DNI…" />
              <CommandList>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  {jugadoras.map((j) => (
                    <CommandItem
                      key={j.id}
                      value={`${j.apellido} ${j.nombre} ${j.dni} ${formatDni(j.dni)}`}
                      onSelect={() => {
                        onChange({
                          id: j.id,
                          nombreCompleto: `${j.nombre} ${j.apellido}`.trim(),
                        })
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === j.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{labelJugadora(j)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {optional && value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Quitar jugadora"
            onClick={() => onChange({ id: null, nombreCompleto: null })}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
