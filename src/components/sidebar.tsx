"use client";

import {
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
    <aside className="w-full shrink-0 lg:w-60 xl:w-72">
      <div className="glass-depth flex w-full flex-col gap-3 p-3 lg:sticky lg:top-6 lg:gap-6 lg:px-5 lg:py-6">
        <Link href="/home" className="hidden items-center gap-2 px-2 lg:flex">
          <PhoneCall className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            React Dialer
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible"
        >
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
                  "h-11 shrink-0 justify-start gap-2 px-3 lg:w-full",
                  isActive && "text-foreground",
                )}
              >
                <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="hidden rounded-md border border-border bg-background/60 p-4 text-xs text-muted-foreground lg:block">
          Signed in as
          <div className="mt-1 text-sm font-medium text-foreground">
            {user?.email ?? "Guest"}
          </div>
        </div>
      </div>
    </aside>
  );
}
