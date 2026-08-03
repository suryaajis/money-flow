"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { NotificationScheduler } from "@/components/layout/NotificationScheduler";
import { authApi } from "@/lib/api";
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

  // Which token has been confirmed valid by the API. We only mount the
  // authenticated chrome — and the heavy chart subtrees inside it — once the
  // current token matches this, so the render tree never flips shape mid-flight
  // (which is what trips React's "rendered more hooks than during the previous
  // render" invariant). Deriving `authed` during render (rather than storing a
  // status) keeps setState out of the effect body.
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const authed = !!token && validatedToken === token;

  useEffect(() => {
    if (isPublicRoute) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (validatedToken === token) return; // already confirmed this token

    // A token string is present, but it may be stale. Validate it against the
    // API before mounting the authenticated tree or loading data. On failure,
    // lib/api's global 401 handler evicts the token and redirects to /login.
    let cancelled = false;
    authApi
      .me()
      .then(() => {
        if (cancelled) return;
        setValidatedToken(token);
        fetchCategories();
        fetchTransactions();
      })
      .catch(() => {
        /* handled globally in lib/api (evict + redirect) */
      });

    return () => {
      cancelled = true;
    };
  }, [token, pathname, isPublicRoute, validatedToken, fetchCategories, fetchTransactions, router]);

  // Login/register render on their own layout, without the sidebar/header shell.
  if (isPublicRoute) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Until the session is confirmed, render an empty themed shell. This keeps a
  // stable top-level tree (always <ThemeProvider>) across checking → authed so
  // React never reconciles two differently-shaped trees at this position.
  if (!authed) {
    return <ThemeProvider>{null}</ThemeProvider>;
  }

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
        <FloatingAddButton />
        <InstallPrompt />
        <NotificationScheduler />
      </div>
    </ThemeProvider>
  );
};
