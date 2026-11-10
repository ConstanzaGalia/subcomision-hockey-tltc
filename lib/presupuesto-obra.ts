/** Objetivo aproximado de esta campaña (obra civil + carpeta de arena). */
export const PROYECTO_APROX_USD = 300_000

export type ProyectoHito = {
  id: string
  momento: string
  etiqueta: string
  titulo: string
  descripcion: string
  incluye?: string[]
  pie?: string
  /** false = horizonte posterior, visual más suave. */
  destacado: boolean
}

export const PROYECTO_HITOS: ProyectoHito[] = [
  {
    id: "obra-civil",
    momento: "Ahora",
    etiqueta: "Etapa 1",
    titulo: "Predio y obra civil",
    descripcion:
      "Se libera el terreno y se arma la base, el cierre y los servicios para poder colocar la superficie de juego.",
    incluye: [
      "Demolición",
      "Limpieza de terreno",
      "Campo de juego",
      "Cerca perimetral",
      "Desagüe",
      "Banco de suplentes",
      "Caminería",
    ],
    destacado: true,
  },
  {
    id: "carpeta-arena",
    momento: "Ahora",
    etiqueta: "Etapa 2",
    titulo: "Carpeta de arena",
    descripcion:
      "Césped sintético con relleno de arena, para entrenar y competencia regional. Junto con la obra civil, es lo que se recauda ahora.",
    incluye: ["Césped sintético", "Relleno de arena", "Colocación y líneas"],
    pie: "TempoGrass (Argentina) representa a Limonta Sport, fabricante certificado por la FIH.",
    destacado: true,
  },
  {
    id: "cancha-agua",
    momento: "Horizonte ~ 3 años",
    etiqueta: "Después",
    titulo: "Cancha de agua",
    descripcion:
      "Superficie wet system: césped irrigado para competencia de alto nivel. No forma parte de esta campaña: el salto se evalúa más adelante, sobre el mismo predio.",
    incluye: ["Sistema de riego", "Colchón elástico (shock pad)"],
    pie: "TempoGrass / Limonta cuando el club pueda encararlo. Cualquier esquema entre clubes de la asociación todavía se evalúa.",
    destacado: false,
  },
]
