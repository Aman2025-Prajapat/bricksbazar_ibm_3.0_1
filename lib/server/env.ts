const WEAK_SECRET_HINTS = ["replace", "change-me", "changeme", "dev-only", "default", "sample"]
const DEV_FALLBACK_AUTH_SECRET = "bricksbazar-dev-auth-secret-please-change-before-production-2026"
const LOCALHOST_HINTS = ["localhost", "127.0.0.1", "::1"]

function hasWeakSecretHint(secret: string) {
  const normalized = secret.toLowerCase()
  return WEAK_SECRET_HINTS.some((hint) => normalized.includes(hint))
}

function hasLocalhostHint(value: string) {
  const normalized = value.trim().toLowerCase()
  return LOCALHOST_HINTS.some((hint) => normalized.includes(hint))
}

function isLocalFileDbUrl(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith("file:") || normalized.startsWith("sqlite:")
}

export function isProductionRuntime() {
  const nodeEnv = process.env.NODE_ENV || ""
  const vercelEnv = process.env.VERCEL_ENV || ""
  const appEnv = process.env.APP_ENV || ""
  return nodeEnv === "production" || vercelEnv === "production" || appEnv === "production"
}

function shouldEnforceCloudDbRules() {
  if (process.env.ENFORCE_CLOUD_DB === "1") return true
  if (process.env.VERCEL === "1") return true
  if ((process.env.VERCEL_ENV || "").toLowerCase() === "production") return true
  if ((process.env.APP_ENV || "").toLowerCase() === "production") return true
  return false
}

export function getNodeEnv() {
  return process.env.NODE_ENV || "development"
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || ""
  const isProduction = isProductionRuntime()
  const isValid = secret.length >= 32 && !hasWeakSecretHint(secret)

  if (isValid) {
    return secret
  }

  // Edge middleware can run without expected env values during local dev sessions.
  // Keep auth stable in dev, but fail hard in production.
  if (!isProduction) {
    return DEV_FALLBACK_AUTH_SECRET
  }

  throw new Error("AUTH_SECRET must be at least 32 chars and not a placeholder value")
}

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || ""
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required")
  }

  if (!shouldEnforceCloudDbRules()) {
    return databaseUrl
  }

  if (isLocalFileDbUrl(databaseUrl) || hasLocalhostHint(databaseUrl)) {
    throw new Error("Production DATABASE_URL must use a cloud DB URL and cannot be localhost/file based")
  }

  return databaseUrl
}

export function assertNoLocalhostInProductionUrl(envName: string, value: string | undefined) {
  const trimmed = value?.trim() || ""
  if (!trimmed || !shouldEnforceCloudDbRules()) {
    return
  }

  if (hasLocalhostHint(trimmed)) {
    throw new Error(`${envName} cannot use localhost in production`)
  }
}

export function validateProductionNetworkUrls() {
  assertNoLocalhostInProductionUrl("PHONEPE_REDIRECT_URL", process.env.PHONEPE_REDIRECT_URL)
  assertNoLocalhostInProductionUrl("PHONEPE_CALLBACK_URL", process.env.PHONEPE_CALLBACK_URL)
  assertNoLocalhostInProductionUrl("VEO_PROVIDER_URL", process.env.VEO_PROVIDER_URL)
}

export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || "",
    textModel: process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.0-flash",
    imageModel: process.env.GEMINI_IMAGE_MODEL?.trim() || "",
  }
}

export function getVeoConfig() {
  return {
    providerUrl: process.env.VEO_PROVIDER_URL?.trim() || "",
    providerKey: process.env.VEO_PROVIDER_API_KEY?.trim() || "",
  }
}
