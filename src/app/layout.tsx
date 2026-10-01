import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Calistoga, Inter } from "next/font/google";

import { cn } from "@lib/utils";

import Providers from "./providers";

const calistoga = Calistoga({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-title",
});

const inter = Inter({
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "Cardápio digital", template: "%s • Cardápio digital" },
  description: "Faça seu pedido pelo cardápio digital e envie pelo WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={cn(inter.variable, calistoga.variable)} lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
