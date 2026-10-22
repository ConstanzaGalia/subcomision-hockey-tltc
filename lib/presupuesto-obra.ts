export type PresupuestoRubro = {
  id: string
  numero: number
  nombre: string
  descripcion: string
}

/** Cotización redondeada de la obra civil inicial, sin desglose. */
export const OBRA_CIVIL_APROX_ARS = 250_000_000
/** Objetivo aproximado de esta campaña (obra civil + carpeta de arena). */
export const PROYECTO_APROX_USD = 300_000

export type ProyectoHito = {
  id: string
  momento: string
  etiqueta: string
  titulo: string
  descripcion: string
  pie?: string
  /** false = horizonte posterior, visual más suave. */
  destacado: boolean
}

export const PROYECTO_HITOS: ProyectoHito[] = [
  {
    id: "obra-civil",
    momento: "Ahora",
    etiqueta: "En marcha",
    titulo: "Predio y obra civil",
    descripcion:
      "Suelo, base, cerca, desagües, bancos y accesos. Deja el campo listo para recibir la superficie de juego.",
    destacado: true,
  },
  {
    id: "carpeta-arena",
    momento: "Ahora",
    etiqueta: "Esta campaña",
    titulo: "Carpeta de arena",
    descripcion:
      "Césped sintético con relleno de arena, para entrenar y para competencia regional. Esto, junto con la obra civil, es lo que se está recaudando ahora.",
    pie: "TempoGrass (Argentina) representa a Limonta Sport, fabricante certificado por la FIH.",
    destacado: true,
  },
  {
    id: "cancha-agua",
    momento: "Horizonte ~ 3 años",
    etiqueta: "Siguiente etapa",
    titulo: "Cancha de agua",
    descripcion:
      "Una superficie wet system: césped sintético irrigado, pensada para competencia de alto nivel. La bocha corre más rápido y el juego se parece al de élite. Pide sistema de riego y, en general, un colchón elástico (shock pad) bajo la carpeta. No forma parte del objetivo de ahora: con el predio y la arena ya hechos, el salto se evalúa más adelante, con TempoGrass / Limonta, cuando el club pueda encararlo.",
    pie: "Cualquier esquema entre clubes de la asociación todavía se evalúa.",
    destacado: false,
  },
]

export const PRESUPUESTO_RUBROS: PresupuestoRubro[] = [
  {
    id: "demolicion",
    numero: 1,
    nombre: "Demolición",
    descripcion:
      "Retiro de la cerca perimetral, árboles y construcciones existentes, junto con las instalaciones eléctricas y de agua que hay que liberar para empezar la obra.",
  },
  {
    id: "limpieza",
    numero: 2,
    nombre: "Limpieza de terreno",
    descripcion:
      "Escarificado y nivelación del predio, extracción del manto vegetal y aplicación de herbicida para dejar el suelo listo.",
  },
  {
    id: "campo",
    numero: 3,
    nombre: "Campo de juego",
    descripcion:
      "Replanteo, estaqueo y base de material granular compactada, que es el soporte sobre el que después se coloca la superficie de hockey.",
  },
  {
    id: "cerca",
    numero: 4,
    nombre: "Cerca perimetral",
    descripcion:
      "Zócalo de hormigón, postes y baranda de caño estructural, alambre tejido y pintura para cerrar el predio de forma segura.",
  },
  {
    id: "desague",
    numero: 5,
    nombre: "Desagüe perimetral",
    descripcion:
      "Canaletas, cuneta para asentar el piso sintético y rejillas, para que el agua no se quede sobre el campo.",
  },
  {
    id: "banco",
    numero: 6,
    nombre: "Banco de suplentes",
    descripcion:
      "Bancos, contrapiso, agua fría, mesa de control con techo y pinturas: el espacio de equipo y planilla junto a la cancha.",
  },
  {
    id: "camineria",
    numero: 7,
    nombre: "Caminería perimetral de acceso",
    descripcion: "Contrapiso de acceso alrededor de la cancha, para circular con seguridad.",
  },
]

/**
 * Desglose orientativo de una carpeta de arena, según guías FIH.
 * No es una cotización del club.
 */
export const CARPETA_RUBROS: PresupuestoRubro[] = [
  {
    id: "cesped",
    numero: 1,
    nombre: "Césped sintético de arena",
    descripcion:
      "Paños de hockey de pelo corto (en general 11 a 18 mm) diseñados para trabajar con relleno de arena.",
  },
  {
    id: "arena",
    numero: 2,
    nombre: "Relleno de arena de sílice",
    descripcion:
      "Se carga sobre la carpeta para sostener el pelo, darle peso y definir el deslizamiento de la bocha. Es parte central de este tipo de superficie.",
  },
  {
    id: "colocacion",
    numero: 3,
    nombre: "Colocación, costuras y líneas",
    descripcion:
      "Tendido de rollos de banda a banda, sellado de juntas, carga de arena y líneas oficiales.",
  },
]

export const CARPETA_NOTA_FUENTES =
  "Referencia orientativa de una carpeta de arena, según la guía de instalaciones y el documento de campos de desarrollo de la FIH. No reemplaza una cotización local."
