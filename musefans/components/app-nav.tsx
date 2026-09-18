"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

const SIDE = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/feed", label: "Notifications", icon: "bell" },
  { href: "/messages", label: "Messages", icon: "mail" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/account", label: "Subscriptions", icon: "heart" },
] as const;

const DOCK = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/feed", label: "Notifications", icon: "bell" },
  { href: "/messages", label: "Messages", icon: "mail" },
] as const;

function onPath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name: (typeof SIDE)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6 shrink-0",
    "aria-hidden": true,
  };

  let paths: ReactNode;
  switch (name) {
    case "home":
      paths = <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />;
      break;
    case "bell":
      paths = (
        <>
          <path d="M6 16h12l-1.2-1.8V11a4.8 4.8 0 1 0-9.6 0v3.2Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </>
      );
      break;
    case "mail":
      paths = (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4.5 7.5 7.5 6 7.5-6" />
        </>
      );
      break;
    case "compass":
      paths = (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m14.8 9.2-1.4 5.2-5.2 1.4 1.4-5.2z" />
        </>
      );
      break;
    case "heart":
      paths = (
        <path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7 2.6C19 15.6 12 20 12 20z" />
      );
      break;
    default: {
      const _never: never = name;
      return _never;
    }
  }

  return <svg {...common}>{paths}</svg>;
}

export function AppNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const next = q.trim();
    router.push(next ? `/discover?q=${encodeURIComponent(next)}` : "/discover");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card px-3 py-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2" translate="no">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight">MuseFans</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 text-[15px] font-semibold">
          {SIDE.map((link) => (
            <Link
              key={link.href}
              href={link.href === "/account" && !email ? "/login?next=/account" : link.href}
              className={`flex items-center gap-3 rounded-full px-3 py-2.5 ${
                onPath(pathname, link.href) ? "bg-canvas text-fg" : "text-fg/80 hover:bg-canvas"
              }`}
            >
              <NavIcon name={link.icon} />
              <span translate="no">{link.label}</span>
            </Link>
          ))}
        </nav>
        {email ? (
          <Link href="/account" className="mt-3 flex items-center gap-2 rounded-full bg-canvas px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {email.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-xs text-muted">{email}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="mt-3 rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        )}
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-card md:ml-60">
        <div className="flex h-14 items-center gap-3 px-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 md:hidden" translate="no">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
              M
            </span>
          </Link>
          <form onSubmit={onSearch} className="flex-1">
            <label htmlFor="top-search" className="sr-only">
              Search muses
            </label>
            <input
              id="top-search"
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search muses"
              className="w-full rounded-full border border-line bg-canvas px-4 py-2 text-sm outline-none focus:border-accent"
            />
          </form>
          <Link
            href={email ? "/account" : "/login"}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-canvas text-xs font-semibold md:hidden"
          >
            {email ? email.slice(0, 1).toUpperCase() : "?"}
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-card py-1.5 text-[10px] font-semibold md:hidden">
        {DOCK.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-0.5 ${
              onPath(pathname, link.href) ? "text-accent" : "text-muted"
            }`}
          >
            <NavIcon name={link.icon} />
            <span translate="no">{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
