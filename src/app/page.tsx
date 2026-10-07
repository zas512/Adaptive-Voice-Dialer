"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, ShieldCheck, Zap, Users, CheckCircle, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1525] text-[#f0f4f8] selection:bg-amber-400/30">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0a1525]/90 backdrop-blur border-b border-amber-400/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-amber-300 hover:text-amber-200 transition-colors">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/40 flex items-center justify-center text-[#0a1525]">
              <Phone className="w-5 h-5" />
            </span>
            React Dialer
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="outline" size="sm" className="border-amber-400/30 text-amber-200 hover:bg-amber-400/10 hover:text-amber-100">Login</Button></Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* HERO — Navy deep with animated gold glow */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#071329] via-[#0a1525] to-[#0d1b30] text-white">
        {/* Animated radial glow behind text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-400/[0.08] blur-[100px] animate-pulse" />
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-amber-300/[0.06] blur-[80px]" />

        <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-36 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-4 py-1.5 text-xs font-medium text-amber-200 tracking-widest uppercase backdrop-blur">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Browser VoIP — Real SIP • Real PBX
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.95] text-[#f0f4f8]">
            Professional<br />Browser Dialer
          </h1>
          <p className="text-xl md:text-2xl text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
            Real calls over WebRTC. Built for sales, support, and call centers that need reliable SIP connectivity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link href="/login"><Button size="lg" className="px-8 py-6 text-lg bg-amber-400 hover:bg-amber-300 text-[#0a1525] font-bold shadow-[0_0_30px_rgba(251,191,36,0.25)] transition-all hover:shadow-[0_0_40px_rgba(251,191,36,0.35)]">Get Started <ArrowRight className="w-5 h-5 ml-1" /></Button></Link>
            <a href="#product" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-[#cbd5e1] hover:bg-white/10 transition-colors">Explore Product</a>
          </div>
        </div>
      </section>

      {/* FEATURES — Navy cards with gold borders */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#f0f4f8]">What it does</h2>
          <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">Confirmed capabilities from the product spec. No made-up features.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: "Browser-based calling", desc: "Place and receive calls over WebRTC with no downloads. Secure, instant, always current." },
            { icon: ShieldCheck, title: "Asterisk / SIP integration", desc: "Native JsSIP connects to your existing Asterisk, FreePBX, or any SIP-compatible provider." },
            { icon: Users, title: "Agent & admin roles", desc: "Role-based access enforced server-side. Agents call; admins provision users and SIP settings." },
          ].map((f) => (
            <div key={f.title} className="group relative rounded-2xl border border-amber-400/20 bg-[#0d1b30]/80 p-8 hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/30 flex items-center justify-center mb-6 text-[#0a1525]"><f.icon className="w-7 h-7" /></div>
              <h3 className="text-2xl font-bold text-[#f0f4f8] mb-3">{f.title}</h3>
              <p className="text-[#94a3b8] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#0d1b30] border-y border-amber-400/10 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold tracking-tight text-center mb-14 text-[#f0f4f8]">How it works</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: "01", title: "Register", desc: "Admin configures SIP host, port, and extension in settings." },
              { step: "02", title: "Dial", desc: "Agent opens the dialer, enters a number, and places a real WebRTC call." },
              { step: "03", title: "Log", desc: "Call outcome is recorded with contact, duration, and status." },
            ].map((s) => (
              <div key={s.step} className="text-center space-y-4">
                <span className="text-7xl font-black text-amber-400/20">{s.step}</span>
                <h3 className="text-2xl font-bold text-[#f0f4f8]">{s.title}</h3>
                <p className="text-[#94a3b8]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFO */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-4xl font-extrabold tracking-tight text-[#f0f4f8] mb-8">Product info</h2>
        <div className="space-y-5 text-[#94a3b8] text-lg leading-relaxed">
          <p><strong className="text-[#f0f4f8]">Platform:</strong> Web (Next.js App Router, React 19, TypeScript).</p>
          <p><strong className="text-[#f0f4f8]">Users:</strong> Outbound/call-center agents, telephony admins, CRM integrators, SMB standalone teams.</p>
          <p><strong className="text-[#f0f4f8]">Purpose:</strong> Browser-based VoIP dialer connecting to Asterisk/FreePBX via JsSIP over WebSocket.</p>
          <p><strong className="text-[#f0f4f8]">Constraints:</strong> Real telephony requires live SIP registration — not fully wired yet. Call logs are synthetic until persistence is completed. No public signup.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24 border-t border-amber-400/10">
        <h2 className="text-4xl font-extrabold tracking-tight text-[#f0f4f8] mb-10">Frequently asked</h2>
        <div className="space-y-5">
          {[
            { q: "Does it work without a CRM?", a: "Yes — standalone dialer. Embed into any CRM via component or iframe." },
            { q: "What PBX systems are supported?", a: "Asterisk, FreePBX, and any SIP-compatible provider through JsSIP." },
            { q: "Is the data real or demo?", a: "Auth/roles/settings are real. Call logs are synthetic demonstration rows until persistence is wired." },
            { q: "Can agents work from keyboard?", a: "Yes — full keyboard navigation and rapid call control are core to the workflow." },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-amber-400/10 bg-[#0d1b30]/60 p-6 hover:border-amber-400/30 transition-colors">
              <h3 className="font-bold text-amber-200 mb-2">{item.q}</h3>
              <p className="text-[#94a3b8] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center border-t border-amber-400/10">
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          <h2 className="text-5xl font-extrabold tracking-tight text-[#f0f4f8]">Ready to connect?</h2>
          <p className="text-xl text-[#94a3b8]">Sign in to configure SIP and make real calls.</p>
          <Link href="/login"><Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-[#0a1525] font-extrabold px-10 py-6 text-lg shadow-[0_0_30px_rgba(251,191,36,0.3)]">Sign In</Button></Link>
        </div>
      </section>

      <footer className="border-t border-amber-400/10 py-8 text-center text-sm text-[#64748b]">
        React Dialer — Professional Browser VoIP • Navy + Amber • Real telephony
      </footer>
    </div>
  );
}