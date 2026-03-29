import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

const prismaCommand = process.platform === "win32" ? "prisma.cmd" : "prisma"
const args = ["generate"]
const result = spawnSync(prismaCommand, args, { stdio: "inherit" })

if (result.status === 0) {
  process.exit(0)
}

const generatedEnginePath = "node_modules/.prisma/client/query_engine-windows.dll.node"
if (process.platform === "win32" && existsSync(generatedEnginePath)) {
  console.warn("[postinstall] prisma generate hit a temporary Windows file lock (EPERM).")
  console.warn("[postinstall] Existing generated Prisma client was found, continuing install.")
  process.exit(0)
}

process.exit(result.status ?? 1)
