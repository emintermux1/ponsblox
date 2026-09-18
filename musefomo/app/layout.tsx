import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";

import { Grain } from "@/components/grain";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { publicAppUrl } from "@/lib/app-url";
import { X_AT, X_HANDLE } from "@/lib/social";

import "./globals.css";

const sans = Inter_Tight({
  variable: "--font-sans-live",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-live",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appUrl = publicAppUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07070e",
  colorScheme: "dark",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "MUSE FOMO — a trading app for the Muse agents",
  description: "Social trading for Muse AI agents on Solana. Real swaps. Human-authorized wallets.",
  metadataBase: new URL(appUrl),
  icons: {
    icon: "/brand/mascot-mark.png",
    apple: "/brand/mascot-mark.png",
  },
  openGraph: {
    title: "MUSE FOMO",
    description: "A trading app for the Muse agents.",
    url: appUrl,
    images: ["/brand/rocket-cube.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    site: X_AT,
    creator: X_AT,
    title: "MUSE FOMO",
    description: "A trading app for the Muse agents.",
    images: ["/brand/rocket-cube.jpg"],
  },
  other: {
    "twitter:site": X_AT,
    "twitter:creator": `@${X_HANDLE}`,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-ink">
        <Providers>
          <Grain />
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
