"use client";

import type React from "react";
import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Chrome, Apple } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const { mutate: login, isPending } = useLogin();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    login(
      { email },
      {
        onSuccess: () => {
          toast({
            title: "Check your email",
            description: "We've sent you a verification code.",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  };

  const handleOAuthLogin = async (provider: "google" | "azure" | "apple") => {
    setIsOAuthLoading(provider);

    login(
      { providerName: provider },
      {
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
          setIsOAuthLoading(null);
        },
        onSettled: () => {
          // Don't reset loading state on success for OAuth as it redirects
          if (isOAuthLoading) {
            setIsOAuthLoading(null);
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isOAuthLoading !== null}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isOAuthLoading !== null}
            >
              <Mail className="w-4 h-4 mr-2" />
              {isLoading ? "Sending..." : "Continue with Email"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("google")}
              className="w-full"
              disabled={isLoading || isOAuthLoading !== null}
            >
              <Chrome className="w-4 h-4 mr-2" />
              {isOAuthLoading === "google" ? "Connecting..." : "Google"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("azure")}
              className="w-full"
              disabled={isLoading || isOAuthLoading !== null}
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
              </svg>
              {isOAuthLoading === "azure" ? "Connecting..." : "Microsoft"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("apple")}
              className="w-full"
              disabled={isLoading || isOAuthLoading !== null}
            >
              <Apple className="w-4 h-4 mr-2" />
              {isOAuthLoading === "apple" ? "Connecting..." : "Apple"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
