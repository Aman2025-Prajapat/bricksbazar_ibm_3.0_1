"use client"

import { useState } from "react"
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  helpful: number
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "How do I place an order for construction materials?",
    answer:
      "To place an order, browse our product catalog, add items to your cart, and proceed to checkout. You can specify delivery dates and locations during the ordering process.",
    category: "Orders",
    tags: ["ordering", "cart", "checkout"],
    helpful: 45,
  },
  {
    id: "2",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, debit cards, UPI payments, net banking, and bank transfers. For bulk orders, we also offer credit terms for verified businesses.",
    category: "Payments",
    tags: ["payment", "credit", "upi"],
    helpful: 38,
  },
  {
    id: "3",
    question: "How is delivery cost calculated?",
    answer:
      "Delivery cost is calculated based on distance, order weight, and delivery urgency. Our smart delivery optimizer provides the most cost-effective options.",
    category: "Delivery",
    tags: ["delivery", "cost", "shipping"],
    helpful: 52,
  },
  {
    id: "4",
    question: "Can I track my order in real-time?",
    answer:
      "Yes! Once your order is dispatched, you'll receive a tracking link to monitor your delivery in real-time, including driver location and estimated arrival time.",
    category: "Tracking",
    tags: ["tracking", "real-time", "delivery"],
    helpful: 67,
  },
  {
    id: "5",
    question: "What is the quality assurance process?",
    answer:
      "All materials undergo rigorous quality checks. We provide quality certificates, and our Quality Checker tool helps verify material specifications before delivery.",
    category: "Quality",
    tags: ["quality", "certification", "verification"],
    helpful: 41,
  },
]

export function FAQSystem() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [openItems, setOpenItems] = useState<string[]>([])

  const categories = ["All", ...Array.from(new Set(faqData.map((item) => item.category)))]

  const filteredFAQs = faqData.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const markHelpful = (id: string) => {
    // In a real app, this would update the backend
    console.log(`Marked FAQ ${id} as helpful`)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <HelpCircle className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">Find answers to common questions about BricksBazar</p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No FAQs found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          filteredFAQs.map((item) => (
            <Card key={item.id}>
              <Collapsible open={openItems.includes(item.id)} onOpenChange={() => toggleItem(item.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <CardTitle className="text-lg">{item.question}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{item.category}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {item.helpful} people found this helpful
                          </span>
                        </div>
                      </div>
                      {openItems.includes(item.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{item.answer}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => markHelpful(item.id)}>
                        👍 Helpful
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
