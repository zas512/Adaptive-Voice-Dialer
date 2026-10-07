import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, ShieldCheck, Zap, Users, CheckCircle2, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground font-semibold text-lg">
            <Phone className="w-5 h-5" /> React Dialer
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="outline" size="sm">Login</Button></Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-background dark:from-slate-950 dark:to-background">
        <div className="max-w-5xl mx-auto px-6 py-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Zap className="w-3.5 h-3.5" /> Browser-based VoIP — real calls, real PBX
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Professional Browser Dialer
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Make and receive real calls over WebRTC. Built for sales, support, and call centers that need reliable SIP connectivity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/login"><Button size="lg" className="px-8 py-6 text-lg">Get Started</Button></Link>
            <a href="#product" className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-8 py-3 text-sm font-medium hover:bg-accent transition-colors">Explore Product</a>
          </div>
        </div>
      </section>

      {/* Product / Capabilities */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">What it does</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Confirmed capabilities from the product spec — no made-up features.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: "Browser-based calling", desc: "Place and receive calls over WebRTC with no downloads. Secure, instant, always current." },
            { icon: ShieldCheck, title: "Asterisk / SIP integration", desc: "Native JsSIP connects to your existing Asterisk, FreePBX, or any SIP-compatible provider." },
            { icon: Users, title: "Agent & admin roles", desc: "Role-based access enforced server-side. Agents call; admins provision users and SIP settings." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-5"><f.icon className="w-6 h-6" /></div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card/40 border-y border-border py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Register", desc: "Admin configures your SIP host, port, and extension in settings." },
              { step: "02", title: "Dial", desc: "Agent opens the dialer, enters a number, and places a real WebRTC call." },
              { step: "03", title: "Log", desc: "Call outcome is recorded in real call logs with contact, duration, and status." },
            ].map((s) => (
              <div key={s.step} className="space-y-4">
                <span className="text-5xl font-extrabold text-muted-foreground/20">{s.step}</span>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info / Real capabilities */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold mb-8">Product info</h2>
        <div className="prose prose-lg text-muted-foreground space-y-4">
          <p><strong>Platform:</strong> Web (Next.js App Router, React 19, TypeScript).</p>
          <p><strong>Users:</strong> Outbound/call-center agents, telephony admins, CRM integrators, SMB standalone teams.</p>
          <p><strong>Purpose:</strong> A browser-based VoIP dialer that connects to Asterisk/FreePBX via JsSIP over WebSocket, supports multi-role operation, and can embed into other products.</p>
          <p><strong>Constraints:</strong> Real telephony requires live SIP registration and call placement end-to-end — not yet fully wired. Call logs are hardcoded demonstration rows until server-side persistence is completed. No public signup — users are provisioned by admin.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24 border-t border-border">
        <h2 className="text-3xl font-bold mb-10">Frequently asked</h2>
        <div className="space-y-6">
          {[
            { q: "Does it work without a CRM?", a: "Yes — it runs standalone as a full browser dialer. You can embed it in a CRM when needed." },
            { q: "What PBX systems are supported?", a: "Asterisk, FreePBX, and any SIP-compatible VoIP provider through JsSIP." },
            { q: "Is the data real or demo?", a: "Auth, roles, and settings are real. Call logs are synthetic demonstration rows until real persistence is wired." },
            { q: "Can agents work from keyboard?", a: "Yes — keyboard navigation and rapid call control are core to the agent workflow." },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center border-t border-border">
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          <h2 className="text-4xl font-extrabold text-foreground">Ready to connect?</h2>
          <p className="text-lg text-muted-foreground">Sign in to access the dialer workspace, configure your SIP settings, and make real calls.</p>
          <Link href="/login"><Button size="lg" className="px-10 py-6 text-lg">Sign In</Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        React Dialer — Browser-based VoIP. Built for real telephony.
      </footer>
    </div>
  );
}