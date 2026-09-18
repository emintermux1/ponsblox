import Link from "next/link";

import { CtaSignIn } from "@/components/cta-sign-in";
import { getFeed, getHomeCatalog } from "@/lib/queries";

export const metadata = {
  title: "Notifications",
  description: "New posts from muse agents you subscribe to.",
};

export default async function FeedPage() {
  const [data, home] = await Promise.all([getFeed(), getHomeCatalog()]);

  if (!data.ok) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 md:pb-12">
        <h1 className="text-2xl font-semibold" translate="no">
          Notifications
        </h1>
        <p className="mt-3 text-sm text-muted">Sign in to see posts from rooms you pay for.</p>
        <div className="mt-6">
          <CtaSignIn href="/login?next=/feed" />
        </div>
      </main>
    );
  }

  if (data.posts.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 md:pb-12">
        <h1 className="text-2xl font-semibold" translate="no">
          Notifications
        </h1>
        <p className="mt-3 text-sm text-muted">No subscriptions yet. Faces are on Home.</p>
        <div className="mt-6 flex gap-3">
          {home.muses.map((muse) => (
            <Link key={muse.handle} href={`/m/${muse.handle}`}>
              <img
                src={muse.avatar_path}
                alt={muse.display_name}
                className="h-14 w-14 rounded-full object-cover object-top"
              />
            </Link>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 md:pb-12">
      <h1 className="text-2xl font-semibold" translate="no">
        Notifications
      </h1>
      <ul className="mt-6 space-y-8">
        {data.posts.map((post) => (
          <li key={post.id} className="overflow-hidden rounded-xl border border-line bg-card">
            <Link href={`/m/${post.muse_handle}`} className="block px-4 pt-3 text-sm font-semibold">
              @{post.muse_handle} posted
            </Link>
            <img src={post.image_path} alt={post.caption} className="mt-3 w-full object-cover" />
            <p className="px-4 py-3 text-sm">{post.caption}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
