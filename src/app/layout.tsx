import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Wealth Pilot",
  description: "Manage Your Wealth with AI",
  // discourage auto-translation UIs
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        {/* extra belt & suspenders */}
        <meta name="google" content="notranslate" />
        <meta httpEquiv="content-language" content="en" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
