import { spawnSync } from "child_process"

const cwd = process.cwd().toLowerCase()
const selfPid = process.pid
const force = process.argv.includes("--force")
const includeDev = process.argv.includes("--include-dev")

function normalizeCommandLine(value) {
  if (!value || typeof value !== "string") return ""
  return value.toLowerCase().replaceAll("\\", "/")
}

function shouldStop(commandLine) {
  const line = normalizeCommandLine(commandLine)
  if (!line) return false
  if (line.includes("scripts/cleanup-next-processes.mjs")) return false
  const inRepo = line.includes(cwd.replaceAll("\\", "/"))
  const buildProcesses = line.includes("next build") || line.includes("npm-cli.js\" run build")
  const devProcesses =
    line.includes("next dev") ||
    line.includes("npm-cli.js\" run dev") ||
    line.includes("npm-cli.js\" run dev:next") ||
    line.includes("npm-cli.js\" run dev:reset")

  return inRepo && (buildProcesses || (includeDev && devProcesses))
}

function listNodeProcessesWindows() {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
    ],
    { encoding: "utf8" },
  )

  if (result.status !== 0 || !result.stdout?.trim()) return []
  try {
    const parsed = JSON.parse(result.stdout.trim())
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function listNodeProcessesPosix() {
  const result = spawnSync("ps", ["-axo", "pid=,args="], { encoding: "utf8" })
  if (result.status !== 0 || !result.stdout?.trim()) return []
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const firstSpace = line.indexOf(" ")
      const pid = Number(line.slice(0, firstSpace))
      const cmd = line.slice(firstSpace + 1)
      return { ProcessId: pid, CommandLine: cmd }
    })
}

function stopWindows(pid) {
  spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" })
}

function stopPosix(pid) {
  try {
    process.kill(pid, "SIGKILL")
  } catch {
    // ignore
  }
}

function main() {
  const processes =
    process.platform === "win32" ? listNodeProcessesWindows() : listNodeProcessesPosix()
  const targets = processes
    .map((proc) => ({
      pid: Number(proc.ProcessId),
      commandLine: String(proc.CommandLine ?? ""),
    }))
    .filter((proc) => Number.isFinite(proc.pid) && proc.pid > 0 && proc.pid !== selfPid)
    .filter((proc) => shouldStop(proc.commandLine))

  if (!targets.length) {
    if (force) {
      console.log("No stale Next.js processes found")
    }
    return
  }

  for (const target of targets) {
    if (process.platform === "win32") {
      stopWindows(target.pid)
    } else {
      stopPosix(target.pid)
    }
    console.log(`Stopped stale process PID ${target.pid}`)
  }
}

main()
