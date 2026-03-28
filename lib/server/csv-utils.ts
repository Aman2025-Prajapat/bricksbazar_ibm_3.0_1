export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ",") {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

export function parseCsvText(csvText: string): ParsedCsv {
  const normalized = csvText.replace(/^\uFEFF/, "")
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim())
  const rows = lines.slice(1).map((line) => splitCsvLine(line))

  return { headers, rows }
}

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "")
}

export function buildRowObject(headers: string[], values: string[]) {
  const row: Record<string, string> = {}
  headers.forEach((header, index) => {
    row[normalizeHeader(header)] = (values[index] || "").trim()
  })
  return row
}
