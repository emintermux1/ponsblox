"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function DiscoverSearch({ q }: { q: string }) {
  const router = useRouter();
  const [value, setValue] = useState(q);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    router.push(`/discover${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={onSearch} className="mt-5 max-w-md">
      <label htmlFor="muse-search" className="block text-sm font-semibold text-muted">
        Search
      </label>
      <input
        id="muse-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Name or handle"
        className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3 text-fg outline-none focus:border-accent"
      />
    </form>
  );
}
