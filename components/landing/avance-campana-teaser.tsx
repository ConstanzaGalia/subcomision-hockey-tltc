import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AvanceCampanaTeaser() {
  return (
    <section id="avance" className="scroll-mt-28 bg-[#eff4ff] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-heading mb-1 inline-flex items-center gap-2 text-xs font-black tracking-widest text-[#7c5800] uppercase">
            Transparencia
          </div>
          <h2 className="font-heading text-3xl font-black text-[#00163d] uppercase sm:text-4xl">
            Avance de la campaña
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            El detalle del avance de la campaña (recaudado, objetivo y desglose por fuente) está
            disponible para las jugadoras en el portal. Ingresá con tu DNI para verlo.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="bg-[#00163d] text-white hover:bg-[#0a2a66]"
            >
              <Link href="/auth/login">Ingresar al portal</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
