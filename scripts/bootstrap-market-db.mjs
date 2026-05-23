import prismaClientPkg from "@prisma/client"
import bcrypt from "bcryptjs"
import fs from "node:fs"
import path from "node:path"

const { PrismaClient } = prismaClientPkg

function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) return
  const envPath = path.join(process.cwd(), ".env")
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, "utf-8")
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const idx = trimmed.indexOf("=")
    if (idx <= 0) return
    const key = trimmed.slice(0, idx).trim()
    const valueRaw = trimmed.slice(idx + 1).trim()
    const unquoted =
      (valueRaw.startsWith("\"") && valueRaw.endsWith("\"")) ||
      (valueRaw.startsWith("'") && valueRaw.endsWith("'"))
        ? valueRaw.slice(1, -1)
        : valueRaw
    if (!process.env[key]) {
      process.env[key] = unquoted
    }
  })
}

loadDotEnvIfNeeded()

const prisma = new PrismaClient()
const databaseUrl = process.env.DATABASE_URL ?? ""
const isPostgres = /^(postgres|postgresql|prisma\+postgres):\/\//i.test(databaseUrl.trim())

const statements = [
  `CREATE TABLE IF NOT EXISTS market_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT NOT NULL,
    stock INTEGER NOT NULL,
    min_stock INTEGER NOT NULL,
    status TEXT NOT NULL,
    rating REAL NOT NULL,
    image TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    total REAL NOT NULL,
    items_json TEXT NOT NULL,
    estimated_delivery TEXT NOT NULL,
    tracking_number TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS market_order_shipments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    tracking_number TEXT,
    estimated_delivery TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT,
    payment_intent_id TEXT,
    gateway_order_id TEXT,
    gateway_transaction_id TEXT,
    gateway_signature TEXT,
    gateway_payload TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_payment_intents (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    gateway_order_id TEXT,
    gateway_transaction_id TEXT,
    gateway_signature TEXT,
    gateway_payload TEXT,
    verified_at TEXT,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    buyer_id TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    distributor_id TEXT NOT NULL,
    distributor_name TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    driver_phone TEXT NOT NULL,
    status TEXT NOT NULL,
    eta_minutes INTEGER NOT NULL,
    pickup_lat REAL,
    pickup_lng REAL,
    drop_lat REAL,
    drop_lng REAL,
    current_lat REAL,
    current_lng REAL,
    current_heading REAL,
    current_speed_kph REAL,
    current_address TEXT,
    route_distance_km REAL,
    route_duration_minutes INTEGER,
    remaining_distance_km REAL,
    route_polyline TEXT,
    scheduled_start_at TEXT,
    scheduled_end_at TEXT,
    assigned_at TEXT,
    picked_up_at TEXT,
    in_transit_at TEXT,
    near_delivery_at TEXT,
    delivered_at TEXT,
    last_eta_refresh_at TEXT,
    load_weight_tons REAL,
    load_volume_cft REAL,
    truck_type TEXT,
    unload_notes TEXT,
    last_location_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_locations (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    address TEXT NOT NULL,
    speed_kph REAL NOT NULL,
    heading REAL NOT NULL,
    accuracy_meters REAL,
    battery_level REAL,
    eta_minutes INTEGER,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_assignments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    delivery_id TEXT NOT NULL UNIQUE,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_phone TEXT,
    vehicle_type TEXT,
    vehicle_number TEXT,
    pickup_lat REAL,
    pickup_lng REAL,
    drop_lat REAL,
    drop_lng REAL,
    route_distance_km REAL,
    route_duration_minutes INTEGER,
    route_polyline TEXT,
    assigned_by_id TEXT,
    assigned_by_name TEXT,
    assigned_at TEXT NOT NULL,
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_status_logs (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    lat REAL,
    lng REAL,
    meta_json TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_route_stops (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    stop_number INTEGER NOT NULL,
    stop_type TEXT NOT NULL,
    label TEXT NOT NULL,
    address TEXT NOT NULL,
    lat REAL,
    lng REAL,
    status TEXT NOT NULL,
    eta_minutes INTEGER,
    reached_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_otps (
    delivery_id TEXT PRIMARY KEY,
    otp_code TEXT NOT NULL,
    is_verified INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_delivery_proofs (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL UNIQUE,
    otp_verified INTEGER NOT NULL,
    pod_image_url TEXT,
    receiver_signature_url TEXT,
    pod_note TEXT,
    received_by TEXT,
    receiver_phone TEXT,
    delivery_condition TEXT,
    delivered_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_distributor_locations (
    id TEXT PRIMARY KEY,
    distributor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    radius_km REAL NOT NULL,
    status TEXT NOT NULL,
    delivery_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS market_supplier_favorites (
    user_id TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, supplier_name)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_market_delivery_locations_delivery_time
    ON market_delivery_locations (delivery_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_market_delivery_status_logs_delivery_time
    ON market_delivery_status_logs (delivery_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_market_delivery_route_stops_delivery_stop
    ON market_delivery_route_stops (delivery_id, stop_number)`,
]

async function getColumnNames(tableName) {
  let names = new Set()
  if (isPostgres) {
    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = '${tableName}'`,
    )
    names = new Set(columns.map((row) => row.column_name))
  } else {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${tableName})`)
    names = new Set(columns.map((row) => row.name))
  }
  return names
}

async function ensureTableColumns(tableName, definitions) {
  const names = await getColumnNames(tableName)

  for (const definition of definitions) {
    const columnName = definition.split(" ")[0]
    if (names.has(columnName)) continue
    await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`)
  }
}

async function ensurePaymentColumns() {
  const toAdd = [
    "provider TEXT",
    "payment_intent_id TEXT",
    "gateway_order_id TEXT",
    "gateway_transaction_id TEXT",
    "gateway_signature TEXT",
    "gateway_payload TEXT",
    "verified_at TEXT",
  ]

  await ensureTableColumns("market_payments", toAdd)
}

async function ensureSupplierFavoriteColumns() {
  await ensureTableColumns("market_supplier_favorites", ["supplier_id TEXT"])
}

async function ensureOrderColumns() {
  await ensureTableColumns("market_orders", [
    "delivery_address TEXT",
    "payment_status TEXT",
  ])
}

async function ensureDeliveryColumns() {
  await ensureTableColumns("market_deliveries", [
    "pickup_lat REAL",
    "pickup_lng REAL",
    "drop_lat REAL",
    "drop_lng REAL",
    "current_heading REAL",
    "current_speed_kph REAL",
    "route_distance_km REAL",
    "route_duration_minutes INTEGER",
    "remaining_distance_km REAL",
    "route_polyline TEXT",
    "scheduled_start_at TEXT",
    "scheduled_end_at TEXT",
    "assigned_at TEXT",
    "picked_up_at TEXT",
    "in_transit_at TEXT",
    "near_delivery_at TEXT",
    "delivered_at TEXT",
    "last_eta_refresh_at TEXT",
    "load_weight_tons REAL",
    "load_volume_cft REAL",
    "truck_type TEXT",
    "unload_notes TEXT",
  ])

  await ensureTableColumns("market_delivery_locations", [
    "accuracy_meters REAL",
    "battery_level REAL",
    "eta_minutes INTEGER",
  ])

  await ensureTableColumns("market_delivery_proofs", [
    "receiver_signature_url TEXT",
    "receiver_phone TEXT",
    "delivery_condition TEXT",
  ])
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
}

function isStrongPassword(password) {
  return (
    password.length >= 10 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

async function ensureAdminAccount() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "")
  const password = String(process.env.ADMIN_PASSWORD || "")
  if (!email || !email.includes("@") || !isStrongPassword(password)) {
    return
  }

  const name = String(process.env.ADMIN_NAME || "Admin").trim() || "Admin"
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "admin",
      passwordHash,
      verified: true,
    },
    create: {
      email,
      name,
      role: "admin",
      passwordHash,
      verified: true,
    },
  })
}

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  await ensureOrderColumns()
  await ensurePaymentColumns()
  await ensureDeliveryColumns()
  await ensureSupplierFavoriteColumns()
  await ensureAdminAccount()
}

main()
  .catch((error) => {
    console.error("[bootstrap-market-db] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })





