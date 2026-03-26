const WEAK_SECRET_HINTS = ["replace", "change-me", "changeme", "dev-only", "default", "sample"]
const DEV_FALLBACK_AUTH_SECRET = "bricksbazar-dev-auth-secret-please-change-before-production-2026"

function hasWeakSecretHint(secret: string) {
  const normalized = secret.toLowerCase()
  return WEAK_SECRET_HINTS.some((hint) => normalized.includes(hint))
}

export function getNodeEnv() {
  return process.env.NODE_ENV || "development"
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || ""
  const isProduction = getNodeEnv() === "production"
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
