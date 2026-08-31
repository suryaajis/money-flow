"use client";

import { useEffect, useRef, useState } from "react";
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

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // The token lives in a zustand `persist` store backed by localStorage. On a
  // cold start (especially the installed PWA) that store rehydrates *after* the
  // first render, so `token` is momentarily null. We must NOT make any auth
  // decision until hydration finishes, or a logged-in user gets bounced to
  // /login on every app launch. Start false on both server and the client's
  // first render (so they match — no hydration-mismatch warning), then resolve
  // on mount: hasHydrated() covers a synchronous localStorage rehydrate,
  // onFinishHydration covers a slower async one.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Optimistic session: once hydrated, a stored token is enough to render the
  // app immediately — no blocking round-trip. This keeps the user logged in
  // across app restarts and works even when the API is slow or offline on
  // reopen. The token is still validated in the background below; a genuine
  // 401 there evicts it (lib/api) and bounces to /login.
  const authed = hydrated && !!token;

  // Kick off validation + data load once per token (a ref, not state, so it
  // never re-triggers a render or the effect).
  const bootstrappedToken = useRef<string | null>(null);

  useEffect(() => {
    if (isPublicRoute || !hydrated) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (bootstrappedToken.current === token) return;
    bootstrappedToken.current = token;

    // Validate the token in the background. A 401 evicts + redirects (lib/api).
    // A network error (offline PWA) is intentionally ignored so the user stays
    // in with cached data.
    authApi.me().catch(() => {});
    fetchCategories();
    fetchTransactions();
  }, [
    token,
    hydrated,
    pathname,
    isPublicRoute,
    fetchCategories,
    fetchTransactions,
    router,
  ]);

  // Login/register render on their own layout, without the sidebar/header shell.
  if (isPublicRoute) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Until hydration settles (and a token is confirmed present) render an empty
  // themed shell — never the login page — so we don't flash login for a user
  // who is actually signed in.
  if (!authed) {
    return <ThemeProvider>{null}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <ServiceWorkerRegistrar />
      <div className="app-canvas min-h-screen bg-background">
        <Sidebar />
        <div
          className={
            sidebarCollapsed
              ? "transition-[padding] duration-300 md:pl-[4.5rem]"
              : "transition-[padding] duration-300 md:pl-[17rem]"
          }
        >
          <Header />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 md:px-8 md:pb-12 xl:px-10">
            <div key={pathname} className="page-enter">
              {children}
            </div>
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
