const productionLike =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.APP_ENV === "production"

if (!productionLike) {
  console.log("[validate-production-env] skipped (non-production runtime)")
  process.exit(0)
}

const errors = []

const databaseUrl = (process.env.DATABASE_URL || "").trim()
if (!databaseUrl) {
  errors.push("DATABASE_URL is required")
} else {
  const normalized = databaseUrl.toLowerCase()
  const hasLocalhost =
    normalized.includes("localhost") || normalized.includes("127.0.0.1") || normalized.includes("::1")
  const isFileDb = normalized.startsWith("file:") || normalized.startsWith("sqlite:")
  if (hasLocalhost || isFileDb) {
    errors.push("DATABASE_URL must be a cloud DB URL in production (localhost/file not allowed)")
  }
}

const authSecret = (process.env.AUTH_SECRET || "").trim()
if (authSecret.length < 32) {
  errors.push("AUTH_SECRET must be at least 32 characters in production")
}

const urlVars = ["PHONEPE_REDIRECT_URL", "PHONEPE_CALLBACK_URL", "VEO_PROVIDER_URL"]
for (const envName of urlVars) {
  const value = (process.env[envName] || "").trim()
  if (!value) continue
  const normalized = value.toLowerCase()
  if (normalized.includes("localhost") || normalized.includes("127.0.0.1") || normalized.includes("::1")) {
    errors.push(`${envName} cannot point to localhost in production`)
  }
}

if (errors.length > 0) {
  console.error("[validate-production-env] failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log("[validate-production-env] ok")
