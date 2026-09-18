"use client";

import { useRouter } from "next/navigation";

import { logoutAccount } from "@/lib/actions";

export function AccountSignOut() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        void logoutAccount().then(() => {
          router.refresh();
          router.push("/");
        });
      }}
      className="mt-4 text-sm font-semibold text-accent"
    >
      Sign out
    </button>
  );
}
