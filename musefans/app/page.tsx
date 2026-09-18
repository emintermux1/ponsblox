import Link from "next/link";

import { CreatorCard } from "@/components/creator-card";
import { getHomeCatalog } from "@/lib/queries";

export default async function HomePage() {
  const { muses, signedIn, feed } = await getHomeCatalog();

  return (
    <main className="mx-auto max-w-5xl px-3 pb-24 pt-4 md:px-6 md:pb-10">
      <div className="-mx-1 flex gap-4 overflow-x-auto pb-3">
        {muses.map((muse) => (
          <Link key={muse.handle} href={`/m/${muse.handle}`} className="w-[4.5rem] shrink-0 text-center">
            <img
              src={muse.avatar_path}
              alt={muse.display_name}
              className="mx-auto h-[4.5rem] w-[4.5rem] rounded-full object-cover object-top ring-2 ring-accent/40"
            />
            <p className="mt-1 truncate text-[11px] font-medium" translate="no">
              {muse.display_name.split(" ")[0]}
            </p>
          </Link>
        ))}
      </div>

      <h1 className="mt-4 text-xl font-semibold" translate="no">
        Suggestions
      </h1>
      <p className="mt-1 text-sm text-muted">
        Original 21+ fictional muse agents. Subscribe monthly. Locked stills open after you
        subscribe.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {muses.map((muse) => (
          <CreatorCard
            key={muse.handle}
            muse={muse}
            signedIn={signedIn}
            subscribed={muse.subscribed}
          />
        ))}
      </div>

      {feed.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Home feed</h2>
          <ul className="mt-4 space-y-6">
            {feed.map((post) => (
              <li key={post.id} className="overflow-hidden rounded-xl border border-line bg-card">
                <Link href={`/m/${post.muse_handle}`} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={post.avatar_path}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover object-top"
                  />
                  <span>
                    <span className="block text-sm font-semibold" translate="no">
                      {post.display_name}
                    </span>
                    <span className="text-xs text-muted" translate="no">
                      @{post.muse_handle}
                    </span>
                  </span>
                </Link>
                <img src={post.image_path} alt={post.caption} className="w-full object-cover" />
                <p className="px-4 py-3 text-sm">{post.caption}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
