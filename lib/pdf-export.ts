export type PdfSection = {
  heading: string
  lines: string[]
}

function toPdfSafeAscii(input: string) {
  return input
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function wrapLine(text: string, maxLength = 96) {
  const sanitized = text.replace(/\s+/g, " ").trim()
  if (sanitized.length <= maxLength) return [sanitized]

  const words = sanitized.split(" ")
  const lines: string[] = []
  let current = ""

  words.forEach((word) => {
    if (!current) {
      current = word
      return
    }
    const next = `${current} ${word}`
    if (next.length <= maxLength) {
      current = next
      return
    }
    lines.push(current)
    current = word
  })

  if (current) {
    lines.push(current)
  }
  return lines
}

export function buildSimplePdf(lines: string[]) {
  const wrappedLines = lines.flatMap((line) => wrapLine(line))
  const clippedLines = wrappedLines.slice(0, 180).map(toPdfSafeAscii)
  const streamOps = ["BT", "/F1 10.5 Tf", "14 TL", "42 800 Td"]

  clippedLines.forEach((line, index) => {
    if (index > 0) {
      streamOps.push("T*")
    }
    streamOps.push(`(${line}) Tj`)
  })
  streamOps.push("ET")

  const stream = `${streamOps.join("\n")}\n`
  const streamLength = stream.length

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${streamLength} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new TextEncoder().encode(pdf)
}

export function buildPdfLines(input: {
  title: string
  subtitle?: string
  meta?: string[]
  sections: PdfSection[]
}) {
  const lines: string[] = []
  lines.push(input.title)
  lines.push("=".repeat(Math.min(90, Math.max(20, input.title.length + 6))))

  if (input.subtitle) {
    lines.push(input.subtitle)
  }

  lines.push(`Generated: ${new Date().toLocaleString()}`)
  if (input.meta && input.meta.length > 0) {
    input.meta.forEach((line) => lines.push(line))
  }

  input.sections.forEach((section) => {
    lines.push("")
    lines.push(section.heading.toUpperCase())
    lines.push("-".repeat(Math.min(90, Math.max(16, section.heading.length + 2))))
    section.lines.forEach((line) => lines.push(line))
  })

  return lines
}

export function downloadPdfDocument(input: {
  filename: string
  title: string
  subtitle?: string
  meta?: string[]
  sections: PdfSection[]
}) {
  const lines = buildPdfLines({
    title: input.title,
    subtitle: input.subtitle,
    meta: input.meta,
    sections: input.sections,
  })
  const blob = new Blob([buildSimplePdf(lines)], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = input.filename.endsWith(".pdf") ? input.filename : `${input.filename}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
