import { redirect } from "next/navigation"

export default function NewSellerProductRedirectPage() {
  redirect("/dashboard/seller/add-product")
}
