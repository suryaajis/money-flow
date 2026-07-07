"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { NotificationScheduler } from "@/components/layout/NotificationScheduler";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useUIStore } from "@/store/uiStore";

// Routes that render without the authenticated app chrome or the auth gate.
const PUBLIC_ROUTES = ["/login", "/register"];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isPublicRoute) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchCategories();
    fetchTransactions();
  }, [token, pathname, isPublicRoute, fetchCategories, fetchTransactions, router]);

  // Login/register render on their own layout, without the sidebar/header shell.
  if (isPublicRoute) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  if (!token) return null;

  return (
    <ThemeProvider>
      <ServiceWorkerRegistrar />
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={sidebarCollapsed ? "md:pl-16" : "md:pl-64"}>
          <Header />
          <main className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
            {children}
          </main>
        </div>
        <MobileNav />
        <InstallPrompt />
        <NotificationScheduler />
      </div>
    </ThemeProvider>
  );
};
