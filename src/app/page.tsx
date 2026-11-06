import { ArrowRight, Headset, Network, PanelsTopLeft, PhoneCall } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="app-canvas min-h-svh text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PhoneCall className="size-5" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-tight">React Dialer</span>
            <span className="mt-1 block text-xs text-muted-foreground">Open SIP workspace</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/login">
              Open dialer <ArrowRight className="size-4" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:pt-20">
        <section className="grid items-center gap-12 border-y border-border/80 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <span className="size-2 rounded-full bg-primary" />
              Built for your SIP environment
            </div>
            <h1 className="max-w-xl text-balance font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl">
              Your line.
              <br />
              <span className="text-primary">Your way to work.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              A browser dialer for your Asterisk, FreePBX, or compatible SIP
              service—standalone, or right alongside your CRM.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/login">
                  Sign in to your dialer <ArrowRight className="size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Access is provisioned by your administrator.
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/5 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-36px_hsl(var(--foreground)/0.28)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Headset className="size-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">One workspace</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Your telephony stack</p>
                  </div>
                </div>
                <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Open SIP
                </span>
              </div>
              <div className="space-y-0 px-5">
                <div className="flex items-start gap-4 border-b border-border py-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Network className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Connect your own service</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Use an administrator-provisioned extension and SIP host.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-b border-border py-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <PhoneCall className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Call in your browser</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Keep call controls, registration, and history in one place.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <PanelsTopLeft className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Work the way you already do</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Open on its own or keep the dialer beside your CRM.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-secondary/60 px-5 py-3 text-xs text-muted-foreground">
                <PhoneCall className="size-3.5 text-primary" />
                Asterisk · FreePBX · Compatible SIP providers
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
