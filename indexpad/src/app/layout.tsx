import type { Metadata } from "next";
import { Bodoni_Moda, IBM_Plex_Mono, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "./providers";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "INDEXPAD",
    template: "%s · INDEXPAD",
  },
  description:
    "Launch your own index on Robinhood. Turn any basket into a market. Create an ETF-style basket from the Pons ecosystem, then launch a coin around it.",
  openGraph: {
    title: "INDEXPAD",
    description: "Launch your own index on Robinhood. Turn any basket into a market.",
    images: [{ url: "/og.jpg", width: 1024, height: 1024, alt: "INDEXPAD" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
