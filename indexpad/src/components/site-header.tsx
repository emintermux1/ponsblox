"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { TickerTape } from "@/components/ticker-tape";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/me", label: "My Indexes" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = pathname === "/";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/[0.06]",
        home ? "bg-[#0b0b0a]/40 backdrop-blur-md" : "bg-[#0b0b0a]/86 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-serif text-[1.4rem] leading-none tracking-[0.08em] text-[#f6f1e6]"
        >
          INDEXPAD
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-1.5 text-[13px] transition-colors",
                  active ? "text-[#f3efe4]" : "text-white/55 hover:text-[#f3efe4]",
                )}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-0.5 h-px bg-accent"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden md:block">
          <ConnectWallet />
        </div>

        <button
          type="button"
          className="ml-auto inline-flex size-9 items-center justify-center rounded-full border border-line text-[#f3efe4] md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/[0.06] bg-[#0b0b0a]/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-[15px] text-[#f3efe4]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4">
            <ConnectWallet />
          </div>
        </div>
      ) : null}

      {!home ? <TickerTape /> : null}
    </header>
  );
}
