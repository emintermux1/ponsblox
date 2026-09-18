import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Let’s Arc — The reply to launch",
  description:
    "Reply @letslauncharc $TICKER Coin Name on any X post. We launch a real token on Argus (Arc mainnet) and reply with the live URL.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${instrument.className}`}>
        {children}
      </body>
    </html>
  );
}
