import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-6 h-6 text-foreground" />
            <span className="text-xl font-semibold text-foreground">React Dialer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button>
                Login
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Professional Browser Dialer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Make and receive real calls directly from your browser. Built for sales, support, and call center teams who need reliable VoIP connectivity with Asterisk/FreePBX.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/#features" className="text-muted-foreground hover:text-foreground">
              Learn More
            </Link>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-20 grid gap-8 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">Browser-Based Calling</h3>
              <p className="text-muted-foreground">
                No softphone downloads. Place and receive calls using WebRTC directly in your browser—secure, instant, and always up-to-date.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">Asterisk &amp; SIP Integration</h3>
              <p className="text-muted-foreground">
                Native JsSIP integration connects to your existing Asterisk, FreePBX, or any SIP-compatible VoIP infrastructure.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">CRM Embeddable</h3>
              <p className="text-muted-foreground">
                Drop the dialer into any CRM via component or iframe. Clean separation ensures no style conflicts with host applications.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">Agent &amp; Admin Roles</h3>
              <p className="text-muted-foreground">
                Role-based access: agents focus on calls, admins manage users, extensions, and system settings—all enforced server-side.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">Real Call Logs</h3>
              <p className="text-muted-foreground">
                Every call is logged with contact, direction, duration, and outcome—no mock data, real telemetry from your PBX.
              </p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-foreground mb-2">Keyboard-First Workflow</h3>
              <p className="text-muted-foreground">
                Designed for agents who live on the keyboard: full keyboard navigation, visible focus states, and rapid call control.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}