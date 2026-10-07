"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

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
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) setError(result.error);
      else { router.push("/home"); router.refresh(); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col">
      {/* Nav */}
      <nav className="w-full px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-900/30">
            <Phone className="w-4 h-4" />
          </div>
          React Dialer
        </Link>
        <ThemeToggle />
      </nav>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* Brand block */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-amber-300 tracking-wide">
              <Lock className="w-3 h-3" /> Secure Sign In
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Welcome back</h1>
            <p className="text-slate-400 text-base">Sign in to access your dialer workspace and connect to your PBX.</p>
          </div>

          {/* Card */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-8 space-y-5 shadow-2xl shadow-black/20">
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-200">Email</Label>
              <Input
                id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" required disabled={loading}
                className="h-11 bg-white/[0.07] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-200">Password</Label>
              <Input
                id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required disabled={loading}
                className="h-11 bg-white/[0.07] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/40 focus-visible:border-amber-500/60"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 transition-all">
              {loading ? "Signing in..." : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">Need an account? Contact your administrator.</p>
          <div className="text-center"><Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← Back to home</Link></div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">React Dialer — Professional VoIP Dialer</footer>
    </div>
  );
}