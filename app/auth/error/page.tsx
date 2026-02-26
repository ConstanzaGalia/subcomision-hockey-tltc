import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-destructive">Error de Autenticacion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground leading-relaxed">
            Ocurrio un error durante el proceso de autenticacion. Por favor intenta nuevamente.
          </p>
          <Button asChild>
            <Link href="/auth/login">Volver al Login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
