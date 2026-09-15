import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hobart Premium Meat Co. — Processing & Inventory",
    template: "%s · Hobart Premium Meat Co.",
  },
  description:
    "Livestock intake, boning-room yield analysis, cold-room inventory and wholesale order management for a Hobart meat processor.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0d0c" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `(function(){try{var m=localStorage.getItem('hpm-theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
