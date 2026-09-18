"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/wallet";
import { TickerTape } from "@/components/ticker-tape";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/me", label: "My Indexes" },
] as const;

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ip-grain pointer-events-none absolute inset-0" aria-hidden />
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-line/70",
          home ? "bg-[#0b0b0a]/35 backdrop-blur-md" : "bg-[#0b0b0a]/88 backdrop-blur-md",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-baseline gap-3">
            <span className="font-serif text-[1.35rem] leading-none tracking-[0.06em] text-[#f4efe4]">
              INDEXPAD
            </span>
            <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.18em] text-accent/80 sm:block">
              Robinhood floor
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((link) => {
              const on =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-2.5 py-1.5 text-[13px] transition-colors",
                    on ? "text-[#f4efe4]" : "text-foreground/55 hover:text-foreground",
                  )}
                >
                  {link.label}
                  {on ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-px bg-accent"
                    />
                  ) : null}
                </Link>
              );
            })}
            <ConnectWallet />
          </nav>
        </div>
      </header>
      <TickerTape />
      <div className="relative flex-1">{children}</div>
    </div>
  );
}
