import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealth Pilot",
  description: "Control your Wealth with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body suppressHydrationWarning className="">
        {children}
      </body>
    </html>
  );
}
