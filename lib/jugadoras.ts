export type DivisionRow = {
  id: string
  codigo: string
  nombre: string
  edad_min: number | null
  edad_max: number | null
  es_manual: boolean
  orden: number
}

export type BloqueRow = {
  id: string
  division_id: string
  nombre: string
  orden: number
}

export type JugadoraRow = {
  id: string
  apellido: string
  nombre: string
  dni: string
  fecha_nacimiento: string
  division_id: string
  division_manual: boolean
  bloque_id: string | null
  activa: boolean
}

export type JugadoraInput = {
  apellido: string
  nombre: string
  dni: string
  fecha_nacimiento: string
  divisionManual: boolean
}
