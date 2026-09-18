import Link from "next/link";

import { AccountSignOut } from "@/components/account-sign-out";
import { CtaSignIn } from "@/components/cta-sign-in";
import { formatUsd } from "@/lib/money";
import { getAccount } from "@/lib/queries";

export const metadata = {
  title: "Account",
  description: "Your MuseFans subscriptions and tips.",
};

export default async function AccountPage() {
  const data = await getAccount();

  if (!data.ok) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 md:pb-12">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-3 text-sm text-muted">Sign in to see subscriptions.</p>
        <div className="mt-6">
          <CtaSignIn />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-10 md:pb-12">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-3 text-sm text-muted">{data.email}</p>
      <AccountSignOut />

      <h2 className="mt-10 text-lg font-semibold" translate="no">
        Subscriptions
      </h2>
      {data.subscriptions.length === 0 ? (
        <p className="mt-3 text-sm text-muted">None yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.subscriptions.map((row) => (
            <li key={row.handle} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
              <img src={row.avatar_path} alt="" className="h-12 w-12 rounded-full object-cover object-top" />
              <div>
                <Link href={`/m/${row.handle}`} className="text-base font-semibold" translate="no">
                  {row.display_name}
                </Link>
                <p className="text-sm text-muted">{formatUsd(row.price_cents)}/mo</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold">Tips</h2>
      {data.tips.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No tips sent.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {data.tips.map((tip) => (
            <li key={tip.id}>
              {formatUsd(tip.amount_cents)} to {tip.display_name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
