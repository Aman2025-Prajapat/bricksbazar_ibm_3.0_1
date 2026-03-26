/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev and production artifacts separate to avoid chunk/css 404
  // when build/reset runs while a dev server is active.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Prevent ENOENT crashes from corrupted/missing filesystem pack cache on Windows dev.
      config.cache = { type: "memory" }
    }
    return config
  },
  onDemandEntries: {
    // Keep pages alive longer in dev to avoid frequent chunk/css 404 during recompiles.
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 8,
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ]
    const noStoreHeader = { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }
    const isDev = process.env.NODE_ENV === "development"
    const defaultHeaders = isDev ? [...securityHeaders, noStoreHeader] : securityHeaders

    return [
      {
        source: "/:path*",
        headers: defaultHeaders,
      },
      {
        source: "/auth",
        headers: [...securityHeaders, noStoreHeader],
      },
      {
        source: "/dashboard/:path*",
        headers: [...securityHeaders, noStoreHeader],
      },
      {
        source: "/api/:path*",
        headers: [...securityHeaders, noStoreHeader],
      },
    ]
  },
}

export default nextConfig
