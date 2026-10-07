"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const baseNavItems = [
  { title: "Dialer", href: "/home", icon: LayoutDashboard },
  { title: "Call Logs", href: "/home/call-logs", icon: PhoneCall },
  { title: "Settings", href: "/home/settings", icon: Settings },
  { title: "KYC", href: "/home/kyc", icon: ShieldCheck },
];

const adminNavItems = [
  { title: "Users", href: "/home/admin/users", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = user?.role === "admin" ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <aside className="hidden lg:flex xl:w-72 shrink-0">
      <div className="w-full h-full bg-[#0a1525] border-r border-amber-400/10 flex flex-col px-5 py-6 gap-6 rounded-r-2xl shadow-[4px_0_30px_rgba(251,191,36,0.08)]">
        <Link href="/" className="flex items-center gap-2.5 px-2 text-amber-300 font-extrabold text-xl tracking-tight hover:text-amber-200 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-[#0a1525] flex items-center justify-center shadow-lg shadow-amber-900/30">
            <PhoneCall className="w-4 h-4" />
          </span>
          React Dialer
        </Link>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2.5 h-10 font-medium transition-all",
                  active ? "bg-amber-400 text-[#0a1525] hover:bg-amber-300 shadow-md shadow-amber-900/20" : "text-[#94a3b8] hover:text-[#f0f4f8] hover:bg-white/5"
                )}
              >
                <Link href={item.href}>
                  <Icon className="w-4 h-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="rounded-xl border border-amber-400/10 bg-[#0d1b30]/60 p-4 text-xs text-[#94a3b8]">
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber-300/70 mb-1">Signed in</div>
          <div className="text-sm font-semibold text-[#f0f4f8] break-all">{user?.email ?? "Guest"}</div>
        </div>
      </div>
    </aside>
  );
}