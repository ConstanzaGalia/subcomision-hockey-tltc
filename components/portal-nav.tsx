const LINKS = [
  { href: "#avance", label: "Avance" },
  { href: "#cuenta", label: "Cuenta" },
  { href: "#rifas", label: "Rifas" },
  { href: "#cuota", label: "Cuota" },
  { href: "#plantel-cuota", label: "Plantel" },
  { href: "#parcelas", label: "Parcelas" },
] as const

export function PortalNav({
  links = LINKS,
}: {
  links?: readonly { href: string; label: string }[]
}) {
  return (
    <nav
      aria-label="Secciones del portal"
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="-mx-px flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:none] sm:mx-auto sm:max-w-5xl sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex h-10 shrink-0 snap-start items-center rounded-full border border-transparent bg-muted/60 px-4 text-sm font-medium text-foreground active:bg-muted"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
