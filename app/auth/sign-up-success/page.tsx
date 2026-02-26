import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center gap-4">
          <Image
            src="/images/logo-ltc.png"
            alt="Lawn Tenis Club Logo"
            width={80}
            height={80}
            className="rounded-md"
          />
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Registro Exitoso</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sub Comision de Hockey
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground leading-relaxed">
            Te enviamos un email de confirmacion. Por favor revisa tu bandeja de entrada y confirma tu cuenta para poder acceder al sistema.
          </p>
          <Button asChild variant="outline">
            <Link href="/auth/login">Volver al Login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
