"use client";

import {
  LayoutDashboard,
  PhoneCall,
  Settings,
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
    <aside className="w-full shrink-0 lg:w-60 xl:w-64">
      <div className="flex w-full flex-col gap-4 border-b border-border/80 pb-3 lg:sticky lg:top-0 lg:min-h-svh lg:border-b-0 lg:border-r lg:bg-card lg:px-5 lg:py-7">
        <Link href="/home" className="hidden items-center gap-3 px-2 lg:flex">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PhoneCall className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-tight text-foreground">
              React Dialer
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Open SIP workspace
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex gap-1 overflow-x-auto lg:mt-8 lg:flex-1 lg:flex-col lg:overflow-visible"
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
                variant="ghost"
                className={cn(
                  "h-11 shrink-0 justify-start gap-3 rounded-xl px-3 text-muted-foreground hover:text-foreground lg:w-full",
                  isActive &&
                    "bg-primary/10 font-semibold text-primary hover:bg-primary/15",
                )}
              >
                <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                  <Icon className={cn("size-[18px]", isActive && "text-primary")} />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="hidden border-t border-border pt-4 lg:block">
          <div className="flex items-start gap-3 px-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
              {(user?.name || user?.email || "G").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Signed in as</span>
              <span className="mt-1 block truncate text-sm font-medium text-foreground">
                {user?.name || user?.email || "Guest"}
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <PhoneCall className="size-3.5 text-primary" />
            Open SIP workspace
          </div>
        </div>
      </div>
    </aside>
  );
}
