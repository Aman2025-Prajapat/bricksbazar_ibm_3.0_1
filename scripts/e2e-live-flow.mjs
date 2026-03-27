const baseUrl = (process.env.E2E_BASE_URL || "https://bricksbazaribmlive.vercel.app").replace(/\/+$/, "")
const driverApiKey = (process.env.DRIVER_TRACKING_API_KEY || "").trim()

function toIso(hoursFromNow = 24) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

function createSession(label) {
  return {
    label,
    cookie: "",
  }
}

function extractSessionCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers)
  const setCookies = getSetCookie ? getSetCookie() : []
  for (const cookie of setCookies) {
    const [value] = cookie.split(";")
    if (value.startsWith("bb_session=")) {
      return value
    }
  }
  return ""
}

async function apiRequest(session, path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.json ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  }

  if (session?.cookie) {
    headers.Cookie = session.cookie
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
    redirect: "follow",
  })

  const setCookie = extractSessionCookie(response)
  if (session && setCookie) {
    session.cookie = setCookie
  }

  const raw = await response.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = { raw }
  }

  return { ok: response.ok, status: response.status, data }
}

async function assertOk(step, result) {
  if (!result.ok) {
    throw new Error(`${step} failed (${result.status}): ${JSON.stringify(result.data)}`)
  }
}

async function main() {
  const now = Date.now()
  const buyerEmail = `e2e.buyer.${now}@bricksbazar.test`
  const distributorEmail = `e2e.distributor.${now}@bricksbazar.test`
  const password = "Testpass123"

  const buyer = createSession("buyer")
  const distributor = createSession("distributor")

  const summary = {
    baseUrl,
    buyerEmail,
    distributorEmail,
    orderId: "",
    orderNumber: "",
    deliveryId: "",
    paymentMode: "",
    gpsPushed: false,
    buyerTrackingStatus: "",
    buyerTrackingAddress: "",
  }

  const registerBuyer = await apiRequest(buyer, "/api/auth/register", {
    method: "POST",
    json: {
      name: "E2E Buyer",
      email: buyerEmail,
      password,
      role: "buyer",
    },
  })
  await assertOk("buyer register", registerBuyer)

  const registerDistributor = await apiRequest(distributor, "/api/auth/register", {
    method: "POST",
    json: {
      name: "E2E Distributor",
      email: distributorEmail,
      password,
      role: "distributor",
    },
  })
  await assertOk("distributor register", registerDistributor)

  const productsResult = await apiRequest(buyer, "/api/products")
  await assertOk("products fetch", productsResult)
  const products = productsResult.data?.products || []
  const firstActive = products.find((product) => product.status === "active" && product.stock > 0)
  if (!firstActive) {
    throw new Error("No active product available for E2E order")
  }

  let paymentIntentId
  let paymentMethod = "UPI"
  const createIntent = await apiRequest(buyer, "/api/payments", {
    method: "POST",
    json: {
      action: "create_intent",
      provider: "razorpay",
      amount: Math.max(200, Number(firstActive.price) * 2),
      currency: "INR",
    },
  })

  if (createIntent.ok && createIntent.data?.intentId && createIntent.data?.gatewayOrderId) {
    const verifyIntent = await apiRequest(buyer, "/api/payments", {
      method: "POST",
      json: {
        action: "verify_intent",
        provider: "razorpay",
        intentId: createIntent.data.intentId,
        razorpayOrderId: createIntent.data.gatewayOrderId,
        razorpayPaymentId: `pay_mock_${Date.now()}`,
        razorpaySignature: `sig_mock_${Date.now()}`,
      },
    })

    if (verifyIntent.ok && verifyIntent.data?.verified) {
      paymentIntentId = verifyIntent.data.intentId
      paymentMethod = "RAZORPAY-UPI"
    }
  }

  summary.paymentMode = paymentMethod

  const placeOrder = await apiRequest(buyer, "/api/orders", {
    method: "POST",
    json: {
      items: [{ productId: firstActive.id, quantity: 2 }],
      paymentMethod,
      paymentIntentId,
      deliveryAddress: "H.No 42, Vijay Nagar, Indore, Madhya Pradesh, 452010",
      requestedDeliveryDate: toIso(30),
      preferredDistributorName: "MP Logistics Dispatch",
      preferredVehicleType: "Truck",
    },
  })
  await assertOk("order create", placeOrder)

  summary.orderId = placeOrder.data?.order?.id || ""
  summary.orderNumber = placeOrder.data?.order?.orderNumber || ""
  if (!summary.orderId) {
    throw new Error("Order ID missing from create order response")
  }

  const confirmOrder = await apiRequest(distributor, `/api/orders/${summary.orderId}`, {
    method: "PATCH",
    json: {
      status: "confirmed",
      estimatedDelivery: toIso(18),
      distributorName: "E2E Distributor Ops",
      vehicleType: "Truck",
      vehicleNumber: "MP09TR1001",
      driverName: "Ravi Sharma",
      driverPhone: "9898989898",
      etaMinutes: 180,
    },
  })
  await assertOk("order confirm", confirmOrder)

  const shipOrder = await apiRequest(distributor, `/api/orders/${summary.orderId}`, {
    method: "PATCH",
    json: {
      status: "shipped",
    },
  })
  await assertOk("order ship", shipOrder)

  const trackingBeforeGps = await apiRequest(buyer, `/api/orders/${summary.orderId}/tracking`)
  await assertOk("buyer tracking fetch", trackingBeforeGps)
  summary.deliveryId = trackingBeforeGps.data?.delivery?.id || ""
  if (!summary.deliveryId) {
    throw new Error("Delivery ID missing from tracking response")
  }

  if (driverApiKey) {
    const gpsPush = await apiRequest(null, "/api/driver/location", {
      method: "POST",
      headers: { "x-driver-api-key": driverApiKey },
      json: {
        deliveryId: summary.deliveryId,
        lat: 22.7196,
        lng: 75.8577,
        address: "AB Road, Indore, Madhya Pradesh",
        speedKph: 36,
        heading: 90,
        status: "in_transit",
      },
    })
    await assertOk("driver gps push", gpsPush)
    summary.gpsPushed = true
  }

  const trackingAfterGps = await apiRequest(buyer, `/api/orders/${summary.orderId}/tracking`)
  await assertOk("buyer tracking refresh", trackingAfterGps)

  summary.buyerTrackingStatus = trackingAfterGps.data?.delivery?.status || "unknown"
  summary.buyerTrackingAddress = trackingAfterGps.data?.delivery?.currentAddress || "not_shared_yet"

  console.log(JSON.stringify({ ok: true, summary }, null, 2))
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
})
