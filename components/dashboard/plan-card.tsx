"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

interface Plan {
  id: string
  name: string
  price: number
  tokens: number
  maxDocuments: number
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tokens: 100,
    maxDocuments: 15,
    features: ["Up to 15 documents", "100 processing tokens", "Basic document parsing", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    tokens: 1000,
    maxDocuments: 100,
    popular: true,
    features: [
      "Up to 100 documents",
      "1,000 processing tokens",
      "Advanced document parsing",
      "Real-time processing",
      "Priority support",
      "API access",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    tokens: 5000,
    maxDocuments: 500,
    features: [
      "Up to 500 documents",
      "5,000 processing tokens",
      "Enterprise-grade parsing",
      "Custom integrations",
      "Dedicated support",
      "Advanced analytics",
      "White-label options",
    ],
  },
]

interface PlanCardProps {
  currentPlan: string
  onSelectPlan: (planId: string) => void
}

export function PlanCard({ currentPlan, onSelectPlan }: PlanCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className={`relative ${plan.popular ? "border-blue-500 shadow-lg" : ""}`}>
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
          )}

          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold">${plan.price}</span>
              {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {plan.tokens} tokens • {plan.maxDocuments} documents
              </div>
            </div>

            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={currentPlan === plan.id ? "secondary" : "default"}
              disabled={currentPlan === plan.id}
              onClick={() => onSelectPlan(plan.id)}
            >
              {currentPlan === plan.id ? "Current Plan" : "Select Plan"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
