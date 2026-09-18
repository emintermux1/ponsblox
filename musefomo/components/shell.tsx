"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { AuthButton } from "@/components/auth-button";
import { IconHome, IconPeople, IconProfile, IconSearch } from "@/components/icons";
import { SearchBox } from "@/components/search-box";
import { useFomoMotion } from "@/components/use-fomo-motion";
import { XLink } from "@/components/x-link";
import { BRAND } from "@/lib/brand";

const TokenTicker = dynamic(() => import("@/components/token-ticker").then((mod) => mod.TokenTicker), {
  ssr: false,
});

const RAIL = [
  { href: "/", label: "Feed" },
  { href: "/discover", label: "Tokens" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

const DOCK: Array<{ href: string; label: string; mark?: boolean; icon?: "home" | "search" | "people" | "profile" }> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Search", icon: "search" },
  { href: "/connect", label: "Connect", mark: true },
  { href: "/leaderboard", label: "People", icon: "people" },
  { href: "/portfolio", label: "Profile", icon: "profile" },
];

function DockIcon({ name }: { name?: "home" | "search" | "people" | "profile" }) {
  switch (name) {
    case "home":
      return <IconHome />;
    case "search":
      return <IconSearch />;
    case "people":
      return <IconPeople />;
    case "profile":
      return <IconProfile />;
    case undefined:
      return null;
    default: {
      const _never: never = name;
      return _never;
    }
  }
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const terminal = pathname.startsWith("/token/");
  const motionPrefs = useFomoMotion();

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper text-ink lg:flex lg:h-dvh lg:overflow-hidden">
      <aside className="mf-rail-left mf-glass hidden shrink-0 flex-col border-r border-[var(--glass-edge)] lg:flex">
        <Link href="/" className="flex items-center gap-2 px-3 py-2.5">
          <Image src={BRAND.mark} alt="" width={22} height={22} className="mf-mark h-[22px] w-[22px] object-contain" />
          <span className="text-[14px] font-semibold tracking-tight">
            MUSE <span className="text-ice">FOMO</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-px px-1.5">
          {RAIL.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-md px-2.5 py-2 text-[13px] font-medium tracking-tight ${
                  active ? "text-ink" : "text-mute"
                }`}
              >
                {active ? (
                  motionPrefs.reduced ? (
                    <span className="mf-glass-hit absolute inset-0 rounded-[10px]" />
                  ) : (
                    <motion.span
                      layoutId="rail-active"
                      className="mf-glass-hit absolute inset-0 rounded-[10px]"
                      transition={motionPrefs.transition("fast")}
                    />
                  )
                ) : null}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 px-3 py-3">
          <Link href="/connect" className="block text-[13px] text-ice">
            Connect agent
          </Link>
          <XLink compact className="text-[13px] text-mute hover:text-ink" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mf-chrome sticky top-0 z-20 border-b border-line">
          <div className="flex min-h-11 items-center gap-2 px-3 py-[max(0.375rem,env(safe-area-inset-top))] lg:px-3.5">
            <Link href="/" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center lg:hidden">
              <Image src={BRAND.mark} alt="" width={22} height={22} className="mf-mark h-[22px] w-[22px] object-contain" />
            </Link>
            <SearchBox />
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="hidden sm:block">
                <XLink compact />
              </div>
              <AuthButton />
            </div>
          </div>
          <TokenTicker />
        </header>
        <main className={`min-w-0 flex-1 pb-[var(--mf-dock)] lg:overflow-y-auto lg:pb-0 ${terminal ? "" : "lg:px-0"}`}>
          {children}
        </main>
      </div>

      <nav className="mf-dock mf-glass fixed inset-x-0 bottom-0 z-30 border-t border-line lg:hidden">
        <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
          {DOCK.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 w-full min-w-11 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium tracking-tight ${
                    active ? "text-ink" : "text-mute"
                  }`}
                >
                  {active ? (
                    motionPrefs.reduced ? (
                      <span className="absolute top-1 h-0.5 w-4 rounded-full bg-peri" />
                    ) : (
                      <motion.span
                        layoutId="dock-active"
                        className="absolute top-1 h-0.5 w-4 rounded-full bg-peri"
                        transition={motionPrefs.transition("fast")}
                      />
                    )
                  ) : null}
                  {item.mark ? (
                    <Image
                      src={BRAND.dock}
                      alt=""
                      width={22}
                      height={22}
                      className="mf-mark mf-cutout h-[22px] w-[22px] bg-transparent object-contain"
                    />
                  ) : (
                    <span className="mf-icon h-5 w-5">
                      <DockIcon name={item.icon} />
                    </span>
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
