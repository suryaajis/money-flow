"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { DataBootstrap } from "@/components/layout/DataBootstrap";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    <DataBootstrap />
    <ServiceWorkerRegistrar />
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-64">
        <Header />
        <main className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
      <InstallPrompt />
    </div>
  </ThemeProvider>
);
