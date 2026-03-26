import crypto from "crypto"

const secret = crypto.randomBytes(48).toString("base64url")
console.log(secret)
