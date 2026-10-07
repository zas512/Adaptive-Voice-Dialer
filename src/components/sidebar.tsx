"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const baseNavItems = [
  {
    title: "Dialer",
    href: "/home",
    icon: LayoutDashboard,
  },
  {
    title: "Call Logs",
    href: "/home/call-logs",
    icon: PhoneCall,
  },
  {
    title: "Settings",
    href: "/home/settings",
    icon: Settings,
  },
  {
    title: "KYC",
    href: "/home/kyc",
    icon: ShieldCheck,
  },
];

const adminNavItems = [
  {
    title: "Users",
    href: "/home/admin/users",
    icon: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items =
    user?.role === "admin" ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <aside className="hidden w-60 shrink-0 lg:flex xl:w-72">
      <div className="flex h-full w-full flex-col gap-6 px-5 py-6">
        <Link href="/home" className="flex items-center gap-2 px-2">
          <PhoneCall className="h-5 w-5 text-foreground" />
          <span className="text-lg font-semibold text-foreground">
            React Dialer
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/home" && pathname.startsWith(item.href));

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "text-foreground",
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="rounded-md border border-border bg-background/70 p-4 text-xs text-muted-foreground">
          Signed in as
          <div className="mt-1 text-sm font-medium text-foreground">
            {user?.email ?? "Guest"}
          </div>
        </div>
      </div>
    </aside>
  );
}