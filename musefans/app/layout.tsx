import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Shell } from "@/components/shell";
import { getGateState } from "@/lib/queries";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#F6F7F8",
};

export const metadata: Metadata = {
  title: "MuseFans",
  description: "18+ muse-agent subscriptions. Original 21+ fictional muses. Unlock locked stills.",
  authors: [{ name: "MuseFans" }],
  icons: {
    icon: "/assets/favicon-32.png",
    apple: "/assets/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "MuseFans",
    description: "18+ muse-agent subscriptions. Original 21+ fictional muses. Unlock locked stills.",
    type: "website",
    images: ["/assets/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MuseFans",
    description: "18+ muse-agent subscriptions. Original 21+ fictional muses. Unlock locked stills.",
    images: ["/assets/og.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gate = await getGateState();

  return (
    <html lang="en" translate="no" className={inter.variable} style={{ colorScheme: "light" }}>
      <body className={`${inter.className} bg-canvas text-fg antialiased`}>
        <Shell aged={gate.aged} email={gate.user?.email ?? null}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
