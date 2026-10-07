"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

interface HomeLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function HomeLayout({ children, className }: HomeLayoutProps) {
  const pathname = usePathname();

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
    <div className="min-h-screen bg-[#0a1525] text-[#f0f4f8]">
      <div className="flex min-h-screen gap-6 px-4 py-6 md:px-6">
        <Sidebar />
        <div className="flex flex-1 flex-col gap-6">
          <header className="sticky top-6 z-30 flex items-center justify-between gap-3 border border-amber-400/10 bg-[#0d1b30]/95 px-6 py-4 backdrop-blur shadow-lg shadow-black/20 rounded-xl">
            <div className="text-base font-semibold text-foreground sm:text-lg">
              {activeTitle}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <main
            className={`flex-1 overflow-y-auto px-6 lg:px-8 ${className ?? ""}`}
          >
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}