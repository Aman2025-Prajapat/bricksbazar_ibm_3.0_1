import crypto from "node:crypto"

const baseUrl = (process.env.E2E_BASE_URL || "https://bricksbazaribmlive.vercel.app").replace(/\/+$/, "")
const driverApiKey = (process.env.DRIVER_TRACKING_API_KEY || "").trim()
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim()

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

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const now = Date.now()
  const buyerEmail = `e2e.buyer.${now}@bricksbazar.test`
  const distributorEmail = `e2e.distributor.${now}@bricksbazar.test`
  const password = "Testpass123"
  const adminEmail = (process.env.E2E_ADMIN_EMAIL || "").trim()
  const adminPassword = (process.env.E2E_ADMIN_PASSWORD || "").trim()

  const buyer = createSession("buyer")
  const distributor = createSession("distributor")
  const admin = createSession("admin")
  let distributorUserId = ""

  const summary = {
    baseUrl,
    buyerEmail,
    distributorEmail,
    orderId: "",
    orderNumber: "",
    deliveryId: "",
    paymentMode: "",
    locationUpdateMode: "",
    locationEventsPushed: 0,
    otpIssued: false,
    otpVerified: false,
    proofStored: false,
    alertsBeforeDelivery: 0,
    buyerTrackingStatus: "",
    buyerTrackingAddress: "",
    buyerTrackingLocations: 0,
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

  const buyerLogin = await apiRequest(buyer, "/api/auth/login", {
    method: "POST",
    json: {
      email: buyerEmail,
      password,
    },
  })
  await assertOk("buyer login", buyerLogin)

  const registerDistributor = await apiRequest(distributor, "/api/auth/register", {
    method: "POST",
    json: {
      name: "E2E Distributor",
      email: distributorEmail,
      password,
      role: "distributor",
      verificationProfile: {
        businessName: "E2E Ground Logistics",
        contactPhone: "9898989898",
        businessAddress: "Ring Road Logistics Hub, Indore",
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: "452010",
        gstNumber: "23ABCDE1234F1Z5",
        idProofType: "GST Certificate",
        idProofNumber: "GST-E2E-1001",
      },
    },
  })
  if (registerDistributor.status !== 202) {
    await assertOk("distributor register", registerDistributor)
  }

  const distributorLogin = await apiRequest(distributor, "/api/auth/login", {
    method: "POST",
    json: {
      email: distributorEmail,
      password,
    },
  })
  distributorUserId = distributorLogin.data?.user?.id || ""
  const distributorNeedsApproval = distributorLogin.ok && distributorLogin.data?.requiresApproval === true

  if ((!distributorLogin.ok && distributorLogin.status === 403) || distributorNeedsApproval) {
    if (!adminEmail || !adminPassword) {
      throw new Error(
        "distributor account requires admin approval. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for automated approval.",
      )
    }

    const adminLogin = await apiRequest(admin, "/api/auth/login", {
      method: "POST",
      json: { email: adminEmail, password: adminPassword },
    })
    await assertOk("admin login for verification review", adminLogin)

    const usersResponse = await apiRequest(admin, "/api/admin/users")
    await assertOk("admin users fetch", usersResponse)
    const distributorUser = (usersResponse.data?.users || []).find((user) => user.email === distributorEmail)
    if (!distributorUser) {
      throw new Error("registered distributor not found in admin users list")
    }

    const approveResponse = await apiRequest(admin, "/api/admin/users", {
      method: "PATCH",
      json: {
        userId: distributorUser.id,
        decision: "approve",
        adminNotes: "Approved in automated E2E flow",
      },
    })
    await assertOk("admin approve distributor", approveResponse)

    const distributorLoginRetry = await apiRequest(distributor, "/api/auth/login", {
      method: "POST",
      json: { email: distributorEmail, password },
    })
    await assertOk("distributor login after approval", distributorLoginRetry)
    if (distributorLoginRetry.data?.requiresApproval) {
      throw new Error("distributor still pending verification even after admin approval")
    }
    distributorUserId = distributorLoginRetry.data?.user?.id || distributorUserId
  } else if (!distributorLogin.ok) {
    throw new Error(`distributor login failed (${distributorLogin.status}): ${JSON.stringify(distributorLogin.data)}`)
  }

  if (!distributorUserId) {
    const distributorMe = await apiRequest(distributor, "/api/auth/me")
    if (distributorMe.ok) {
      distributorUserId = distributorMe.data?.user?.id || ""
    }
  }

  const productsResult = await apiRequest(buyer, "/api/products")
  await assertOk("products fetch", productsResult)
  const products = productsResult.data?.products || []
  const firstActive = products.find((product) => product.status === "active" && product.stock > 0)
  if (!firstActive) {
    throw new Error("No active product available for E2E order")
  }

  const paymentMethod = "RAZORPAY-UPI"
  summary.paymentMode = paymentMethod

  const placeOrder = await apiRequest(buyer, "/api/orders", {
    method: "POST",
    json: {
      items: [{ productId: firstActive.id, quantity: 2 }],
      paymentMethod,
      deliveryAddress: "H.No 42, Vijay Nagar, Indore, Madhya Pradesh, 452010",
      requestedDeliveryDate: toIso(30),
      preferredDistributorId: distributorUserId || undefined,
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
      distributorId: distributorUserId || undefined,
      distributorName: "E2E Distributor Ops",
      vehicleType: "Truck",
      vehicleNumber: "MP09TR1001",
      driverName: "Ravi Sharma",
      driverPhone: "9898989898",
      etaMinutes: 180,
    },
  })
  await assertOk("order confirm", confirmOrder)

  const trackingPaymentGate = await apiRequest(buyer, `/api/orders/${summary.orderId}/tracking`)
  await assertOk("tracking payment gate", trackingPaymentGate)
  assertCondition(
    typeof trackingPaymentGate.data?.message === "string" &&
      trackingPaymentGate.data.message.toLowerCase().includes("payment"),
    "Expected buyer payment prompt after approval",
  )

  const payableAmount = Number(placeOrder.data?.order?.total || 0) || Math.max(200, Number(firstActive.price) * 2)
  const createIntent = await apiRequest(buyer, "/api/payments", {
    method: "POST",
    json: {
      action: "create_intent",
      provider: "razorpay",
      amount: payableAmount,
      currency: "INR",
    },
  })
  await assertOk("payment intent create", createIntent)

  const razorpayPaymentId = `pay_mock_${Date.now()}`
  const razorpayOrderId = createIntent.data.gatewayOrderId
  const razorpaySignature =
    razorpayKeySecret && razorpayOrderId
      ? crypto.createHmac("sha256", razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex")
      : `sig_mock_${Date.now()}`

  const verifyIntent = await apiRequest(buyer, "/api/payments", {
    method: "POST",
    json: {
      action: "verify_intent",
      provider: "razorpay",
      intentId: createIntent.data.intentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
  })
  await assertOk("payment intent verify", verifyIntent)
  assertCondition(Boolean(verifyIntent.data?.intentId), "Verified payment intent missing")

  const settlePayment = await apiRequest(buyer, "/api/payments", {
    method: "POST",
    json: {
      action: "settle_order",
      orderId: summary.orderId,
      intentId: verifyIntent.data.intentId,
      paymentMethod,
    },
  })
  await assertOk("order payment settle", settlePayment)

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

    const secondGpsPush = await apiRequest(null, "/api/driver/location", {
      method: "POST",
      headers: { "x-driver-api-key": driverApiKey },
      json: {
        deliveryId: summary.deliveryId,
        lat: 22.7283,
        lng: 75.8664,
        address: "Scheme 140, Indore, Madhya Pradesh",
        speedKph: 22,
        heading: 260,
        status: "nearby",
      },
    })
    await assertOk("driver gps push nearby", secondGpsPush)
    summary.locationUpdateMode = "driver_api_key"
    summary.locationEventsPushed = 2
  } else {
    const locationPush = await apiRequest(distributor, `/api/deliveries/${summary.deliveryId}/location`, {
      method: "POST",
      json: {
        lat: 22.7196,
        lng: 75.8577,
        address: "AB Road, Indore, Madhya Pradesh",
        speedKph: 30,
        heading: 80,
        status: "in_transit",
      },
    })
    await assertOk("session location push", locationPush)

    const secondLocationPush = await apiRequest(distributor, `/api/deliveries/${summary.deliveryId}/location`, {
      method: "POST",
      json: {
        lat: 22.7283,
        lng: 75.8664,
        address: "Scheme 140, Indore, Madhya Pradesh",
        speedKph: 16,
        heading: 250,
        status: "nearby",
      },
    })
    await assertOk("session location push nearby", secondLocationPush)
    summary.locationUpdateMode = "distributor_session"
    summary.locationEventsPushed = 2
  }

  const issueOtp = await apiRequest(buyer, `/api/deliveries/${summary.deliveryId}/otp`, {
    method: "POST",
    json: { expiresInMinutes: 30 },
  })
  await assertOk("buyer issue otp", issueOtp)
  const issuedOtpCode = issueOtp.data?.otp?.otpCode || ""
  assertCondition(/^\d{6}$/.test(issuedOtpCode), "OTP code missing for buyer")
  summary.otpIssued = true

  const distributorOtpRead = await apiRequest(distributor, `/api/deliveries/${summary.deliveryId}/otp`)
  await assertOk("distributor otp read", distributorOtpRead)
  assertCondition(distributorOtpRead.data?.otp?.otpCode === null, "Distributor should not receive OTP code")

  const alertsBeforeDelivery = await apiRequest(distributor, `/api/deliveries/${summary.deliveryId}/alerts`)
  await assertOk("alerts before delivery", alertsBeforeDelivery)
  const beforeAlerts = Array.isArray(alertsBeforeDelivery.data?.alerts) ? alertsBeforeDelivery.data.alerts : []
  summary.alertsBeforeDelivery = beforeAlerts.length

  const delivered = await apiRequest(distributor, `/api/deliveries/${summary.deliveryId}`, {
    method: "PATCH",
    json: {
      status: "delivered",
      otpCode: issuedOtpCode,
      podNote: "Package received in good condition.",
      receivedBy: "Site Supervisor",
      podImageUrl: "https://example.com/e2e/pod-proof.jpg",
    },
  })
  await assertOk("mark delivered with otp", delivered)
  summary.otpVerified = delivered.data?.proof?.otpVerified === true

  const proofResult = await apiRequest(buyer, `/api/deliveries/${summary.deliveryId}/proof`)
  await assertOk("delivery proof fetch", proofResult)
  assertCondition(proofResult.data?.proof?.otpVerified === true, "Delivery proof missing OTP verification")
  summary.proofStored = Boolean(proofResult.data?.proof?.id)

  const trackingAfterCompletion = await apiRequest(buyer, `/api/orders/${summary.orderId}/tracking`)
  await assertOk("buyer tracking refresh", trackingAfterCompletion)
  assertCondition(
    trackingAfterCompletion.data?.delivery?.status === "delivered",
    `Expected delivered status, got ${trackingAfterCompletion.data?.delivery?.status || "unknown"}`,
  )

  summary.buyerTrackingStatus = trackingAfterCompletion.data?.delivery?.status || "unknown"
  summary.buyerTrackingAddress = trackingAfterCompletion.data?.delivery?.currentAddress || "not_shared_yet"
  summary.buyerTrackingLocations = Array.isArray(trackingAfterCompletion.data?.locations)
    ? trackingAfterCompletion.data.locations.length
    : 0

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
