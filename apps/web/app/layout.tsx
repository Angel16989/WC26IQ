import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const dataFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "WorldCupIQ",
  description: "World Cup analytics scaffold with placeholder routes and mock-backed APIs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}
    >
      <body className={bodyFont.className}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
