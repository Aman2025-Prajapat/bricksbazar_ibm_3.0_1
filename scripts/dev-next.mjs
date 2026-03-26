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

  return Array.from(pids)
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
    commandLine.includes("npm-cli.js\" run dev:next")
  )
}

function killProcessTreeWindows(pid) {
  if (process.platform !== "win32" || !pid || pid <= 0) return
  spawnSync("cmd.exe", ["/d", "/s", "/c", `taskkill /PID ${pid} /T /F`], { stdio: "ignore" })
}

function ensurePort3000Ready() {
  if (process.platform !== "win32") return true

  const repoPath = process.cwd().toLowerCase().replaceAll("\\", "/")
  const pids = getListeningPidsOnPort3000Windows()
  if (!pids.length) return true

  let foreignPid = null
  for (const pid of pids) {
    if (isRepoNextProcessWindows(pid, repoPath)) {
      killProcessTreeWindows(Number(pid))
      console.log(`Stopped stale process on port 3000 (PID ${pid})`)
    } else {
      foreignPid = pid
    }
  }

  if (!foreignPid) return true
  console.error(`Port 3000 is occupied by PID ${foreignPid}. Stop that process and run dev again.`)
  return false
}

if (!ensurePort3000Ready()) {
  process.exit(1)
}

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next")

const child = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_DISABLE_SWC_WORKER: "1",
  },
})

let cleanedUp = false
const cleanupChildTree = () => {
  if (cleanedUp) return
  cleanedUp = true
  if (process.platform === "win32") {
    killProcessTreeWindows(child.pid ?? 0)
    return
  }
  if (!child.killed) {
    child.kill("SIGTERM")
  }
}

const forwardSignal = (signal) => {
  if (process.platform === "win32") {
    cleanupChildTree()
    return
  }
  if (!child.killed) {
    child.kill(signal)
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"))
process.on("SIGTERM", () => forwardSignal("SIGTERM"))
process.on("exit", () => cleanupChildTree())

child.on("error", (error) => {
  cleanupChildTree()
  console.error(`Failed to start Next.js dev server: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

child.on("close", (code, signal) => {
  cleanupChildTree()
  if (signal) {
    console.log(`Next.js dev server stopped by signal: ${signal}`)
    process.exit(0)
  }
  process.exit(code ?? 0)
})
