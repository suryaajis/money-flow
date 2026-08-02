import type { Metadata } from "next";

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s · Money Flow" template, which
  // would otherwise render "Money Flow · Money Flow" on the auth pages.
  // These pages are client components, so the title must live on this layout.
  title: { absolute: "Money Flow" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      {children}
    </div>
  );
}
