import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const title = "MUSE WORLD";
const description = "A living penthouse. Four muses. You watch.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title,
  description,
  applicationName: title,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
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
  themeColor: "#120e0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-loft-ink">{children}</body>
    </html>
  );
}
