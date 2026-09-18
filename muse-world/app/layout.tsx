import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import {
  PAGE_DESCRIPTION,
  SITE_ORIGIN,
  WORDMARK,
} from "@/components/watch/copy";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
  fallback: ["system-ui", "sans-serif"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "optional",
  fallback: ["Times New Roman", "serif"],
});

const title = WORDMARK;
const description = PAGE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? SITE_ORIGIN),
  title,
  description,
  applicationName: title,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-loft.jpg",
        width: 1280,
        height: 720,
        alt: "A private penthouse loft at night",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-loft.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#120e0b",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-loft-ink">{children}</body>
    </html>
  );
}
