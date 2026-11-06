"use client";

import { ArrowLeft, ArrowRight, Check, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAuthSession } from "@/lib/auth-client";
import { isAuthUser } from "@/lib/auth-types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Could not sign in. Please try again.";
        throw new Error(message);
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("token" in result) ||
        typeof result.token !== "string" ||
        !("user" in result) ||
        !isAuthUser(result.user)
      ) {
        throw new Error("The sign-in response was invalid. Please try again.");
      }

      saveAuthSession({ token: result.token, user: result.user });
      router.replace("/home");
    } catch (err: unknown) {
      console.error("[auth] Sign-in request failed.", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="app-canvas min-h-svh text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PhoneCall className="size-5" />
          </span>
          <span className="text-base font-semibold">React Dialer</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <section className="hidden max-w-xl lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <span className="size-2 rounded-full bg-primary" />
            Open SIP · Browser-based
          </div>
          <h1 className="mt-7 font-serif text-5xl font-semibold leading-[1.08] tracking-tight">
            Good to have
            <br />
            <span className="text-primary">you on the line.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Sign in to your administrator-provisioned account and connect to
            your own SIP environment.
          </p>
          <ul className="mt-9 space-y-4">
            {[
              "Your extension, configured by your administrator",
              "Calls placed directly from your browser",
              "A workspace that fits alongside your CRM",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-secondary-foreground"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <p className="eyebrow">Open SIP workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Sign in
            </h1>
          </div>
          <Card className="border-border/80 shadow-[0_20px_60px_-36px_hsl(var(--foreground)/0.3)]">
            <CardHeader className="space-y-2 pb-5">
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <PhoneCall className="size-5" />
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Welcome back
              </CardTitle>
              <CardDescription>
                Sign in with the account provisioned by your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="mt-2 h-11 w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="size-4" />}
              </Button>
            </form>
            <div className="rounded-xl bg-secondary/70 px-4 py-3 text-sm leading-6 text-secondary-foreground">
              Need access? Contact your administrator to provision an account.
            </div>
            <div className="border-t border-border pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to home
              </Link>
            </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
