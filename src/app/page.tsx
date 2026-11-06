import { PhoneCall } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">React Dialer</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/login">
                Login
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-balance font-serif text-5xl font-bold text-foreground md:text-7xl">
            A browser dialer for
            <br />
            <span className="text-primary">your SIP environment</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            Use your own Asterisk, FreePBX, or compatible SIP service in a
            standalone dialer or alongside your CRM. Access is provisioned by
            your administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/login">
                Sign in to your dialer
              </Link>
            </Button>
          </div>
        </div>

        <section
          aria-labelledby="product-capabilities"
          className="mx-auto mt-20 w-full max-w-6xl border-y border-border"
        >
          <h2
            id="product-capabilities"
            className="py-6 text-center font-serif text-2xl font-semibold text-foreground"
          >
            One call workspace. Your telephony stack.
          </h2>
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            <article className="py-6 md:px-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">Open SIP</h3>
              <p className="text-muted-foreground">
                Connect an administrator-provisioned extension to a compatible SIP host.
              </p>
            </article>
            <article className="py-6 md:px-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">In the browser</h3>
              <p className="text-muted-foreground">
                Keep calling and call history in one WebRTC-based workspace.
              </p>
            </article>
            <article className="py-6 md:px-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Standalone or embedded
              </h3>
              <p className="text-muted-foreground">
                Use the dialer on its own or place it beside your CRM workflow.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
