import { PrismaClient } from "@prisma/client"
import { getDatabaseUrl, validateProductionNetworkUrls } from "@/lib/server/env"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const databaseUrl = getDatabaseUrl()
validateProductionNetworkUrls()

function isPostgresUrl(url: string | undefined) {
  if (!url) return false
  return /^(postgres|postgresql|prisma\+postgres):\/\//i.test(url.trim())
}

function convertQuestionPlaceholders(query: string) {
  let out = ""
  let index = 0
  let inSingle = false
  let inDouble = false

  for (let i = 0; i < query.length; i++) {
    const ch = query[i]

    if (inSingle) {
      out += ch
      if (ch === "'") {
        if (query[i + 1] === "'") {
          out += query[i + 1]
          i++
        } else {
          inSingle = false
        }
      }
      continue
    }

    if (inDouble) {
      out += ch
      if (ch === '"') {
        inDouble = false
      }
      continue
    }

    if (ch === "'") {
      inSingle = true
      out += ch
      continue
    }

    if (ch === '"') {
      inDouble = true
      out += ch
      continue
    }

    if (ch === "?") {
      index += 1
      out += `$${index}`
      continue
    }

    out += ch
  }

  return out
}

function patchPrismaForPostgres(client: PrismaClient) {
  if (!isPostgresUrl(databaseUrl)) return client

  const originalQueryRawUnsafe = client.$queryRawUnsafe.bind(client)
  const originalExecuteRawUnsafe = client.$executeRawUnsafe.bind(client)

  client.$queryRawUnsafe = ((query: string, ...values: unknown[]) => {
    const converted = convertQuestionPlaceholders(query)
    return originalQueryRawUnsafe(converted, ...values)
  }) as PrismaClient["$queryRawUnsafe"]

  client.$executeRawUnsafe = ((query: string, ...values: unknown[]) => {
    const converted = convertQuestionPlaceholders(query)
    return originalExecuteRawUnsafe(converted, ...values)
  }) as PrismaClient["$executeRawUnsafe"]

  return client
}

export const prisma =
  globalForPrisma.prisma ??
  patchPrismaForPostgres(
    new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
  )

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
