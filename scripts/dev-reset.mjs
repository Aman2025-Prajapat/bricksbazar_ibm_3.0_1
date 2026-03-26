import { existsSync, rmSync } from "fs"
import { spawn, spawnSync } from "child_process"
import path from "path"
import "./check-node-version.mjs"

function getListeningPidsOnPort3000Windows() {
  if (process.platform !== "win32") return []

  const netstat = spawnSync("cmd.exe", ["/d", "/s", "/c", "netstat -ano | findstr :3000"], {
    encoding: "utf8",
  })

  if (netstat.status !== 0 || !netstat.stdout) return []
  const lines = netstat.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const pids = new Set()
  for (const line of lines) {
    if (!line.includes("LISTENING")) continue
    const parts = line.split(/\s+/)
    const pid = parts[parts.length - 1]
    if (pid && /^\d+$/.test(pid)) {
      pids.add(pid)
    }
  }

  return Array.from(pids).filter((pid) => pid !== String(process.pid))
}

function getWindowsProcessCommandLine(pid) {
  if (process.platform !== "win32") return ""
  const command = `(Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\").CommandLine`
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
  })
  if (result.status !== 0 || !result.stdout) return ""
  return result.stdout.trim().toLowerCase().replaceAll("\\", "/")
}

function isRepoNextProcessWindows(pid, repoPath) {
  const commandLine = getWindowsProcessCommandLine(pid)
  if (!commandLine) return false
  if (!commandLine.includes(repoPath)) return false

  return (
    commandLine.includes("/next/dist/bin/next") ||
    commandLine.includes("/next/dist/server/lib/start-server.js") ||
    commandLine.includes("npm-cli.js\" run dev") ||
    commandLine.includes("npm-cli.js\" run dev:reset") ||
    commandLine.includes("npm-cli.js\" run dev:next")
  )
}

function findForeignPidOnPort3000Windows(pids, repoPath) {
  if (process.platform !== "win32") return null
  return pids.find((pid) => !isRepoNextProcessWindows(pid, repoPath)) ?? null
}

function killProcessOnPort3000Windows(pids, repoPath) {
  if (process.platform !== "win32") return
  for (const pid of pids) {
    if (!isRepoNextProcessWindows(pid, repoPath)) {
      console.warn(`Port 3000 is used by PID ${pid} (not this project's Next.js dev server). Leaving it running.`)
      continue
    }
    spawnSync("cmd.exe", ["/d", "/s", "/c", `taskkill /PID ${pid} /F`], { stdio: "ignore" })
    console.log(`Stopped stale process on port 3000 (PID ${pid})`)
  }
}

function pauseWindows(milliseconds) {
  if (process.platform !== "win32") return
  spawnSync("powershell.exe", ["-NoProfile", "-Command", `Start-Sleep -Milliseconds ${Math.max(10, milliseconds)}`], { stdio: "ignore" })
}

function clearDirectorySafe(dirPath, label) {
  if (!existsSync(dirPath)) return true

  const retryableCodes = new Set(["ENOTEMPTY", "EPERM", "EBUSY"])
  const maxAttempts = 6

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      rmSync(dirPath, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 })
      console.log(`Cleared ${label}`)
      return true
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code ?? "") : ""
      const shouldRetry = retryableCodes.has(code) && attempt < maxAttempts
      if (!shouldRetry) {
        console.warn(`Could not clear ${label} (${code || "unknown"}). Continuing without hard reset.`)
        return false
      }
      pauseWindows(140 * attempt)
    }
  }

  return false
}

const shouldResetCache = process.argv.includes("--reset")
const repoPath = process.cwd().toLowerCase().replaceAll("\\", "/")

if (!shouldResetCache && process.platform === "win32") {
  const runningPids = getListeningPidsOnPort3000Windows()
  const runningDevPid = runningPids.find((pid) => isRepoNextProcessWindows(pid, repoPath))

  if (runningDevPid) {
    console.log(`Dev server already running on http://localhost:3000 (PID ${runningDevPid}).`)
    console.log("Use that terminal, or stop it first if you want a fresh restart.")
    process.exit(0)
  }

  const foreignPid = findForeignPidOnPort3000Windows(runningPids, repoPath)
  if (foreignPid) {
    console.error(`Port 3000 is occupied by PID ${foreignPid}. Stop that process, then run dev again.`)
    process.exit(1)
  }
}

if (shouldResetCache) {
  const runningPids = getListeningPidsOnPort3000Windows()
  killProcessOnPort3000Windows(runningPids, repoPath)
  const remainingPids = getListeningPidsOnPort3000Windows()
  const foreignPid = findForeignPidOnPort3000Windows(remainingPids, repoPath)
  if (foreignPid) {
    console.error(`Port 3000 is still occupied by PID ${foreignPid}. Stop it manually and rerun dev:reset.`)
    process.exit(1)
  }
  // Keep reset limited to port-level cleanup. Killing broader repo Node processes can terminate the
  // current npm/dev parent process on Windows, causing localhost to stop unexpectedly.
}

if (shouldResetCache) {
  clearDirectorySafe(".next-dev", ".next-dev cache")
  clearDirectorySafe(".next", ".next cache")
  clearDirectorySafe("node_modules/.cache", "node_modules/.cache")
} else {
  console.log("Skipping cache reset. Use `npm run dev:reset` to force cache cleanup.")
}

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next")
const child = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DISABLE_SWC_WORKER: "1",
  },
})

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal)
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"))
process.on("SIGTERM", () => forwardSignal("SIGTERM"))

child.on("error", (error) => {
  console.error(`Failed to run dev server: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

child.on("close", (code, signal) => {
  if (signal) {
    console.log(`Dev wrapper stopped by signal: ${signal}`)
    process.exit(0)
    return
  }
  process.exit(code ?? 0)
})
