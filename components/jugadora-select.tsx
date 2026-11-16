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
import {
  displayNombreDesdeJugadora,
  filterJugadorasByQuery,
} from "@/lib/match-jugadora"
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
  const [query, setQuery] = useState("")

  const selected = useMemo(
    () => (value ? jugadoras.find((j) => j.id === value) ?? null : null),
    [jugadoras, value],
  )

  const filtered = useMemo(
    () => filterJugadorasByQuery(jugadoras, query).slice(0, 80),
    [jugadoras, query],
  )

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setQuery("")
          }}
        >
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
                    : "Buscar por apellido, nombre o DNI…"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Ej: galia camila · o DNI"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  {filtered.map((j) => (
                    <CommandItem
                      key={j.id}
                      value={j.id}
                      onSelect={() => {
                        onChange({
                          id: j.id,
                          nombreCompleto: displayNombreDesdeJugadora(j),
                        })
                        setOpen(false)
                        setQuery("")
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
      {selected ? (
        <p className="text-xs text-muted-foreground">
          Se guarda como {displayNombreDesdeJugadora(selected)}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Elegí la jugadora para que el movimiento aparezca en su portal.
        </p>
      )}
    </div>
  )
}
