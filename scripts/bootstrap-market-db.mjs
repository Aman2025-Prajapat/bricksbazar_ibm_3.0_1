import prismaClientPkg from "@prisma/client"

const { PrismaClient } = prismaClientPkg
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
    current_lat REAL,
    current_lng REAL,
    current_address TEXT,
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
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
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
    pod_note TEXT,
    received_by TEXT,
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
]

async function ensurePaymentColumns() {
  let names = new Set()
  if (isPostgres) {
    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'market_payments'`,
    )
    names = new Set(columns.map((row) => row.column_name))
  } else {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(market_payments)`)
    names = new Set(columns.map((row) => row.name))
  }
  const toAdd = [
    "provider TEXT",
    "payment_intent_id TEXT",
    "gateway_order_id TEXT",
    "gateway_transaction_id TEXT",
    "gateway_signature TEXT",
    "gateway_payload TEXT",
    "verified_at TEXT",
  ]

  for (const definition of toAdd) {
    const columnName = definition.split(" ")[0]
    if (names.has(columnName)) continue
    await prisma.$executeRawUnsafe(`ALTER TABLE market_payments ADD COLUMN ${definition}`)
  }
}

async function ensureSupplierFavoriteColumns() {
  let names = new Set()
  if (isPostgres) {
    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'market_supplier_favorites'`,
    )
    names = new Set(columns.map((row) => row.column_name))
  } else {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(market_supplier_favorites)`)
    names = new Set(columns.map((row) => row.name))
  }

  if (!names.has("supplier_id")) {
    await prisma.$executeRawUnsafe("ALTER TABLE market_supplier_favorites ADD COLUMN supplier_id TEXT")
  }
}

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  await ensurePaymentColumns()
  await ensureSupplierFavoriteColumns()
}

main()
  .catch((error) => {
    console.error("[bootstrap-market-db] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })





