"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useLogin } from "@refinedev/core"
import { resendOTP } from "@/lib/auth/otp-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function VerifyOTP() {
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutate: login } = useLogin()

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Use the login method with OTP verification parameters
    login(
      {
        email,
        token: otp,
        type: "otp",
      },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Email verified successfully!",
          })
          router.push("/dashboard")
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Verification failed",
            variant: "destructive",
          })
        },
        onSettled: () => {
          setIsLoading(false)
        },
      },
    )
  }

  const handleResendOTP = async () => {
    setIsResending(true)

    try {
      const result = await resendOTP(email)

      if (result.success) {
        toast({
          title: "Code sent",
          description: "A new verification code has been sent to your email.",
        })
      } else {
        throw new Error(result.error?.message || "Failed to resend code")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">We've sent a verification code to {email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="text-center">
            <Button variant="link" onClick={handleResendOTP} disabled={isResending}>
              {isResending ? "Sending..." : "Didn't receive the code? Resend"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
