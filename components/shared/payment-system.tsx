"use client"

import type React from "react"

import { useState } from "react"
import { CreditCard, Wallet, Building2, Smartphone, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PaymentMethod {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  processingFee: number
  processingTime: string
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "card",
    name: "Credit/Debit Card",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Visa, Mastercard, RuPay",
    processingFee: 2.5,
    processingTime: "Instant",
  },
  {
    id: "upi",
    name: "UPI Payment",
    icon: <Smartphone className="h-5 w-5" />,
    description: "Google Pay, PhonePe, Paytm",
    processingFee: 0,
    processingTime: "Instant",
  },
  {
    id: "netbanking",
    name: "Net Banking",
    icon: <Building2 className="h-5 w-5" />,
    description: "All major banks supported",
    processingFee: 1.5,
    processingTime: "2-3 minutes",
  },
  {
    id: "wallet",
    name: "Digital Wallet",
    icon: <Wallet className="h-5 w-5" />,
    description: "Paytm, Amazon Pay, etc.",
    processingFee: 1.0,
    processingTime: "Instant",
  },
]

interface PaymentSystemProps {
  amount: number
  orderId?: string
  onPaymentSuccess?: (paymentId: string) => void
}

export function PaymentSystem({ amount, orderId = "ORD-12345", onPaymentSuccess }: PaymentSystemProps) {
  const [selectedMethod, setSelectedMethod] = useState("upi")
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  const selectedPaymentMethod = paymentMethods.find((method) => method.id === selectedMethod)
  const processingFee = selectedPaymentMethod ? (amount * selectedPaymentMethod.processingFee) / 100 : 0
  const totalAmount = amount + processingFee

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setPaymentComplete(true)

    const paymentId = `PAY-${Date.now()}`
    onPaymentSuccess?.(paymentId)
  }

  if (paymentComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold text-green-700">Payment Successful!</h3>
          <p className="text-muted-foreground">
            Your payment of ₹{totalAmount.toLocaleString()} has been processed successfully.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">
              <strong>Order ID:</strong> {orderId}
            </p>
            <p className="text-sm">
              <strong>Payment ID:</strong> PAY-{Date.now()}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Order Amount</span>
            <span>₹{amount.toLocaleString()}</span>
          </div>
          {processingFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing Fee ({selectedPaymentMethod?.processingFee}%)</span>
              <span>₹{processingFee.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total Amount</span>
            <span>₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Payment Method</Label>
          <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label
                  htmlFor={method.id}
                  className="flex-1 cursor-pointer flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {method.icon}
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {method.processingFee === 0 ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{method.processingFee}% fee</span>
                    )}
                    <p className="text-xs text-muted-foreground">{method.processingTime}</p>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Payment Form */}
        {selectedMethod === "card" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input id="cardName" placeholder="John Doe" />
            </div>
          </div>
        )}

        {selectedMethod === "upi" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input id="upiId" placeholder="yourname@paytm" />
            </div>
          </div>
        )}

        {/* Pay Button */}
        <Button onClick={handlePayment} disabled={isProcessing} className="w-full" size="lg">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing Payment...
            </>
          ) : (
            `Pay ₹${totalAmount.toLocaleString()}`
          )}
        </Button>

        {/* Security Info */}
        <div className="text-center text-xs text-muted-foreground">
          <Shield className="h-4 w-4 inline mr-1" />
          Your payment information is encrypted and secure
        </div>
      </CardContent>
    </Card>
  )
}

export function PaymentDialog({
  amount,
  orderId,
  onPaymentSuccess,
  children,
}: PaymentSystemProps & { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        <PaymentSystem amount={amount} orderId={orderId} onPaymentSuccess={onPaymentSuccess} />
      </DialogContent>
    </Dialog>
  )
}
