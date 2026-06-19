import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Money Flow",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      {children}
    </div>
  );
}
