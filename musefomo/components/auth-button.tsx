"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

const AUTH_CHROME =
  "mf-search inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-[12px] px-3 text-[12px] font-medium tracking-tight text-ink";

function PrivyAuthButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  if (!ready) {
    return <span className="px-2 text-[12px] font-medium tracking-tight text-mute">…</span>;
  }
  if (authenticated) {
    return (
      <button
        type="button"
        onClick={() => void logout()}
        className={`${AUTH_CHROME} max-w-36 truncate text-ice`}
      >
        {user?.email?.address ?? "Signed in"}
      </button>
    );
  }
  return (
    <button type="button" onClick={() => login()} className={AUTH_CHROME}>
      Login
    </button>
  );
}

export function AuthButton() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <Link href="/connect" className={AUTH_CHROME}>
        Connect
      </Link>
    );
  }
  return <PrivyAuthButton />;
}
