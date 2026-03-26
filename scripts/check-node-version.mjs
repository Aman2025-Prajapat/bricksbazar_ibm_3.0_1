const major = Number.parseInt(process.versions.node.split(".")[0] || "0", 10)

if (major < 18 || major > 22) {
  console.error(
    `Unsupported Node.js version: ${process.versions.node}. Use Node 18/20/22 LTS for Next.js 14 stability.`,
  )
  process.exit(1)
}
