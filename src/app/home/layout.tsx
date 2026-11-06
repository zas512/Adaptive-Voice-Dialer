"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface HomeLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function HomeLayout({ children, className }: HomeLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const titleMap: Record<string, string> = {
    "/home": "Dialer",
    "/home/call-logs": "Call Logs",
    "/home/settings": "Settings",
    "/home/kyc": "KYC Management",
    "/home/admin/users": "User Administration",
  };

  const descriptionMap: Record<string, string> = {
    "/home": "Your live connection and calling controls",
    "/home/call-logs": "Recent inbound and outbound activity",
    "/home/settings": "Your profile and account preferences",
    "/home/kyc": "Client records and review status",
    "/home/admin/users": "Accounts, roles, and SIP provisioning",
  };

  const activeTitle =
    titleMap[pathname] ??
    titleMap[
      (Object.keys(titleMap) as string[]).find((key) =>
        pathname.startsWith(key),
      ) || "/home"
    ];

  return (
    <div className="app-canvas min-h-svh text-foreground">
      <div className="mx-auto flex min-h-svh max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:gap-0 lg:px-0 lg:py-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:px-8">
          <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-border/80 py-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {activeTitle}
              </h1>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                {descriptionMap[pathname] ?? "Your dialer workspace"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={() => {
                  clearAuthSession();
                  router.replace("/");
                }}
                className="flex h-10 items-center gap-2 px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </header>
          <main className={cn("min-w-0 flex-1 py-6 sm:py-8", className)}>
            <div className="mx-auto w-full max-w-6xl space-y-7">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
