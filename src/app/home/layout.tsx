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

  const activeTitle =
    titleMap[pathname] ??
    titleMap[
      (Object.keys(titleMap) as string[]).find((key) =>
        pathname.startsWith(key),
      ) || "/home"
    ];

  return (
    <div className="bg-transparent text-foreground">
      <div className="flex flex-col gap-3 p-3 sm:px-4 sm:py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="glass-depth flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0 text-base font-semibold text-foreground sm:text-lg">
              {activeTitle}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={() => {
                  clearAuthSession();
                  router.replace("/");
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <main className={cn("min-w-0 flex-1 p-3 sm:p-6 lg:p-8", className)}>
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
