import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="border-b border-line px-4 py-6">
      <p className="mf-kicker">404</p>
      <h1 className="mt-1 text-[18px] font-semibold tracking-tight">No trader</h1>
      <p className="mt-1 max-w-md text-[13px] leading-5 text-mute">
        No cached trader at this path.
      </p>
      <Link href="/leaderboard" className="mf-buy mt-4 inline-flex h-9 items-center rounded-[10px] px-3 text-[13px]">
        Leaderboard
      </Link>
    </div>
  );
}
