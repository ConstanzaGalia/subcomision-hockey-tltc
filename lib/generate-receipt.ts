import { jsPDF } from "jspdf"

interface ReceiptData {
  receiptNumber: number
  nombreApellido: string
  precio: number
  fecha: string
}

type ExtraordinaryReceiptData = {
  receiptNumber: number
  nombreApellido: string
  moneda: "USD" | "ARS"
  metodoPago: "EFECTIVO" | "TRANSFERENCIA"
  monto: number
  fecha: string // YYYY-MM-DD o ISO
}

function numberToWords(n: number): string {
  const ones = [
    "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE",
    "DIECIOCHO", "DIECINUEVE", "VEINTE",
  ]
  const tens = [
    "", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA",
    "OCHENTA", "NOVENTA",
  ]
  const hundreds = [
    "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
  ]

  if (n === 0) return "CERO"
  if (n === 100) return "CIEN"

  let result = ""

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      result += "MIL "
    } else {
      result += numberToWords(thousands) + " MIL "
    }
    n = n % 1000
  }

  if (n >= 100) {
    result += hundreds[Math.floor(n / 100)] + " "
    n = n % 100
  }

  if (n >= 21 && n <= 29) {
    result += "VEINTI" + ones[n - 20] + " "
  } else if (n > 20) {
    result += tens[Math.floor(n / 10)]
    if (n % 10 !== 0) {
      result += " Y " + ones[n % 10]
    }
    result += " "
  } else if (n > 0) {
    result += ones[n] + " "
  }

  return result.trim()
}

function parseFechaDMY(fecha: string): { day: string; month: string; year: string } {
  // Evita el "un día anterior" cuando fecha viene como 'YYYY-MM-DD' (JS lo interpreta en UTC).
  // También soporta strings tipo 'YYYY-MM-DDTHH:mm:ssZ' extrayendo solo la parte fecha.
  const datePart = fecha.includes("T") ? fecha.split("T")[0] : fecha
  const [y, m, d] = datePart.split("-")
  if (!y || !m || !d) {
    // Fallback: si llega algo inesperado, lo formateamos igual que el input.
    return { day: datePart, month: "", year: "" }
  }
  return {
    day: String(Number(d)).padStart(2, "0"),
    month: String(Number(m)).padStart(2, "0"),
    year: String(y),
  }
}

export async function generateReceipt(data: ReceiptData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // Load logo
  try {
    const logoImg = new window.Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.src = "/images/logo-ltc.png"
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve()
      logoImg.onerror = () => resolve()
    })
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", pageWidth - margin - 30, margin, 30, 30)
    }
  } catch {
    // Continue without logo
  }

  let y = margin

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("VENTA PARCELA", margin, y)
  y += 14

  // Receipt number and date
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const receiptNum = String(data.receiptNumber).padStart(4, "0")
  doc.text(`Recibo N\u00b0: ${receiptNum}`, margin, y)
  y += 7

  const { day, month, year } = parseFechaDMY(data.fecha)
  doc.text(`Fecha: ${day} / ${month} / ${year}`, margin, y)
  y += 14

  // Received from
  doc.text(`Recib\u00ed de: ${data.nombreApellido}`, margin, y)
  doc.setLineWidth(0.3)
  const nameTextWidth = doc.getTextWidth(`Recib\u00ed de: ${data.nombreApellido}`)
  const lineEnd = Math.max(nameTextWidth + margin + 5, margin + contentWidth * 0.7)
  doc.line(margin + doc.getTextWidth("Recib\u00ed de: "), y + 1, lineEnd, y + 1)
  y += 14

  // Amount
  const priceInt = Math.round(data.precio)
  doc.text(`La suma de: USD ${priceInt.toLocaleString("es-AR")}`, margin, y)
  y += 7

  const wordsAmount = numberToWords(priceInt)
  doc.text(`(${wordsAmount} D\u00d3LARES ESTADOUNIDENSES)`, margin, y)
  y += 14

  // Concept
  const conceptText =
    "En concepto de: Compra de parcela de la cancha de hockey del club, como aporte a la campa\u00f1a para la construcci\u00f3n de nuestra nueva cancha."
  const lines = doc.splitTextToSize(conceptText, contentWidth)
  doc.text(lines, margin, y)
  y += lines.length * 6 + 20

  // Footer
  doc.setFont("helvetica", "bold")
  doc.text("Sub Comisi\u00f3n de Hockey", margin, y)
  y += 14

  // Agradecimiento (destacado pero sobrio)
  const agradecimientoY = y
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margin, agradecimientoY, margin + contentWidth, agradecimientoY)
  y += 8

  doc.setFont("helvetica", "italic")
  doc.setFontSize(11)
  const agradecimiento = "Agradecemos su colaboraci\u00f3n para seguir creciendo y hacer realidad este proyecto."
  const agradLines = doc.splitTextToSize(agradecimiento, contentWidth)
  doc.text(agradLines, margin, y)
  y += agradLines.length * 6 + 6

  doc.setDrawColor(0, 0, 0)

  doc.save(`recibo-parcela-${receiptNum}.pdf`)
}

export async function generateExtraordinaryReceipt(data: ExtraordinaryReceiptData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // Load logo
  try {
    const logoImg = new window.Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.src = "/images/logo-ltc.png"
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve()
      logoImg.onerror = () => resolve()
    })
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", pageWidth - margin - 30, margin, 30, 30)
    }
  } catch {
    // Continue without logo
  }

  let y = margin

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("CUOTA EXTRAORDINARIA", margin, y)
  y += 14

  // Receipt number and date
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const receiptNum = String(data.receiptNumber).padStart(4, "0")
  doc.text(`Recibo N\u00b0: ${receiptNum}`, margin, y)
  y += 7

  const { day, month, year } = parseFechaDMY(data.fecha)
  doc.text(`Fecha: ${day} / ${month} / ${year}`, margin, y)
  y += 14

  // Received from
  doc.text(`Recib\u00ed de: ${data.nombreApellido}`, margin, y)
  doc.setLineWidth(0.3)
  const nameTextWidth = doc.getTextWidth(`Recib\u00ed de: ${data.nombreApellido}`)
  const lineEnd = Math.max(nameTextWidth + margin + 5, margin + contentWidth * 0.7)
  doc.line(margin + doc.getTextWidth("Recib\u00ed de: "), y + 1, lineEnd, y + 1)
  y += 14

  // Amount
  const priceInt = Math.round(data.monto)
  doc.text(`La suma de: ${data.moneda} ${priceInt.toLocaleString("es-AR")}`, margin, y)
  y += 7

  const wordsAmount = numberToWords(priceInt)
  const currencyWords =
    data.moneda === "USD" ? "D\u00d3LARES ESTADOUNIDENSES" : "PESOS ARGENTINOS"
  doc.text(`(${wordsAmount} ${currencyWords})`, margin, y)
  y += 14

  // Payment method
  const metodoPagoLabel = data.metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia"
  doc.text(`Medio de pago: ${metodoPagoLabel}`, margin, y)
  y += 7

  // Concept
  const conceptText =
    "En concepto de: Cuota extraordinaria de la cancha de hockey del club, como aporte a la construcci\u00f3n de nuestra nueva cancha."
  const lines = doc.splitTextToSize(conceptText, contentWidth)
  doc.text(lines, margin, y)
  y += lines.length * 6 + 20

  // Footer
  doc.setFont("helvetica", "bold")
  doc.text("Sub Comisi\u00f3n de Hockey", margin, y)
  y += 14

  // Agradecimiento
  const agradecimientoY = y
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margin, agradecimientoY, margin + contentWidth, agradecimientoY)
  y += 8

  doc.setFont("helvetica", "italic")
  doc.setFontSize(11)
  const agradecimiento = "Agradecemos su colaboraci\u00f3n para seguir creciendo y hacer realidad este proyecto."
  const agradLines = doc.splitTextToSize(agradecimiento, contentWidth)
  doc.text(agradLines, margin, y)

  doc.setDrawColor(0, 0, 0)

  doc.save(`recibo-cuota-extraordinaria-${receiptNum}.pdf`)
}

type PrestamoReceiptData = {
  receiptNumber: number
  nombreApellido: string
  monto: number
  fecha: string // YYYY-MM-DD o ISO
  moneda: "USD" // por ahora los prestamos están en USD
}

export async function generatePrestamoReceipt(data: PrestamoReceiptData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // Load logo
  try {
    const logoImg = new window.Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.src = "/images/logo-ltc.png"
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve()
      logoImg.onerror = () => resolve()
    })
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, "PNG", pageWidth - margin - 30, margin, 30, 30)
    }
  } catch {
    // Continue without logo
  }

  let y = margin

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("RECIBO PRESTAMO", margin, y)
  y += 14

  // Receipt number and date
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const receiptNum = String(data.receiptNumber).padStart(4, "0")
  doc.text(`Recibo N\u00b0: ${receiptNum}`, margin, y)
  y += 7

  const { day, month, year } = parseFechaDMY(data.fecha)
  doc.text(`Fecha: ${day} / ${month} / ${year}`, margin, y)
  y += 14

  // Received from
  doc.text(`Recib\u00ed de: ${data.nombreApellido}`, margin, y)
  doc.setLineWidth(0.3)
  const nameTextWidth = doc.getTextWidth(`Recib\u00ed de: ${data.nombreApellido}`)
  const lineEnd = Math.max(nameTextWidth + margin + 5, margin + contentWidth * 0.7)
  doc.line(margin + doc.getTextWidth("Recib\u00ed de: "), y + 1, lineEnd, y + 1)
  y += 14

  const amountInt = Math.round(data.monto)
  doc.text(`La suma de: ${data.moneda} ${amountInt.toLocaleString("es-AR")}`, margin, y)
  y += 7

  const wordsAmount = numberToWords(amountInt)
  const currencyWords =
    data.moneda === "USD" ? "D\u00d3LARES ESTADOUNIDENSES" : "PESOS ARGENTINOS"
  doc.text(`(${wordsAmount} ${currencyWords})`, margin, y)
  y += 14

  // Concept (texto solicitado)
  const conceptText =
    `La subcomision de hockey recibio en concepto de prestamo la suma de ${data.moneda} ${amountInt.toLocaleString(
      "es-AR"
    )}, destinado a la construccion de la nueva cancha de hockey del club.`
  const lines = doc.splitTextToSize(conceptText, contentWidth)
  doc.text(lines, margin, y)
  y += lines.length * 6 + 20

  // Footer
  doc.setFont("helvetica", "bold")
  doc.text("Sub Comisi\u00f3n de Hockey", margin, y)
  y += 14
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margin, y, margin + contentWidth, y)

  doc.setFont("helvetica", "italic")
  doc.setFontSize(11)
  const agradecimiento = "Agradecemos su colaboraci\u00f3n para seguir creciendo y hacer realidad este proyecto."
  const agradLines = doc.splitTextToSize(agradecimiento, contentWidth)
  doc.text(agradLines, margin, y + 8)

  doc.setDrawColor(0, 0, 0)

  doc.save(`recibo-prestamo-${receiptNum}.pdf`)
}
