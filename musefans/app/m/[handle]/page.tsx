import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaSubscribe } from "@/components/cta-subscribe";
import { CtaTip } from "@/components/cta-tip";
import { formatCount, formatUsd } from "@/lib/money";
import { getGateState, getMusePage } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const page = await getMusePage(handle);
  if (!page.ok) return { title: "Muse missing" };
  return { title: page.muse.display_name, description: page.muse.bio };
}

export default async function MuseProfile({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { handle } = await params;
  const search = await searchParams;
  const tab = search.tab === "posts" ? "posts" : "media";
  const [page, gate] = await Promise.all([getMusePage(handle), getGateState()]);
  if (!page.ok) notFound();

  const { muse, posts, subscribed } = page;
  const signedIn = Boolean(gate.user);

  return (
    <main className="relative mx-auto max-w-3xl pb-28 md:pb-12">
      <div className="relative h-44 overflow-hidden md:h-56">
        <img src={muse.banner_path} alt="" className="h-full w-full object-cover" />
      </div>
      <img
        src={muse.avatar_path}
        alt={`${muse.display_name}, ${muse.age}`}
        className="relative z-10 -mt-12 ml-4 h-24 w-24 rounded-full object-cover object-top ring-4 ring-canvas md:ml-6"
      />

      <div className="px-4 pt-3 md:px-6">
        <h1 className="text-2xl font-semibold" translate="no">
          {muse.display_name}
        </h1>
        <p className="mt-0.5 text-sm text-muted" translate="no">
          @{muse.handle} · {muse.age} · 21+ fictional
        </p>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-fg/80">{muse.bio}</p>
        <ul className="mt-4 flex gap-5 text-sm text-muted">
          <li>
            <strong className="text-fg">{formatCount(muse.likes)}</strong> likes
          </li>
          <li>
            <strong className="text-fg">{posts.length}</strong> posts
          </li>
          <li>
            <strong className="text-fg">{formatUsd(muse.price_cents)}</strong>/mo
          </li>
        </ul>
        <div className="mt-5 hidden max-w-sm md:block">
          <CtaSubscribe
            handle={muse.handle}
            priceCents={muse.price_cents}
            subscribed={subscribed}
            signedIn={signedIn}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CtaTip handle={muse.handle} signedIn={signedIn} />
          <Link
            href={`/messages?handle=${muse.handle}`}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          >
            Message
          </Link>
        </div>
      </div>

      <div className="mt-8 flex border-b border-line px-4 md:px-6">
        <Link
          href={`/m/${muse.handle}?tab=media`}
          className={`mr-6 pb-3 text-sm font-semibold ${tab === "media" ? "border-b-2 border-accent text-fg" : "text-muted"}`}
        >
          Media
        </Link>
        <Link
          href={`/m/${muse.handle}?tab=posts`}
          className={`pb-3 text-sm font-semibold ${tab === "posts" ? "border-b-2 border-accent text-fg" : "text-muted"}`}
        >
          Posts
        </Link>
      </div>

      {tab === "posts" ? (
        <ul className="space-y-6 px-4 py-6 md:px-6">
          {posts.map((post) => (
            <li key={post.id} className="overflow-hidden rounded-xl border border-line bg-card">
              <p className="px-4 py-3 text-xs text-muted" translate="no">
                @{muse.handle}
              </p>
              <div className="relative">
                <img
                  src={post.image_path}
                  alt={post.open ? post.caption : "Locked still"}
                  className={`aspect-[3/4] w-full object-cover ${post.open ? "" : "scale-110 blur-xl"}`}
                />
                {!post.open ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <p className="rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white">
                      Locked
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="px-4 py-3 text-sm">{post.open ? post.caption : "Subscribe to open this still."}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1 md:p-2">
          {posts.map((post) => (
            <figure key={post.id} className="relative overflow-hidden bg-card">
              <img
                src={post.image_path}
                alt={post.open ? post.caption : "Locked still"}
                className={`aspect-square w-full object-cover ${post.open ? "" : "scale-110 blur-lg"}`}
              />
              {!post.open ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="text-[10px] font-semibold text-white">Locked</span>
                </div>
              ) : null}
            </figure>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-12 z-30 border-t border-line bg-card px-4 py-3 md:hidden">
        <CtaSubscribe
          handle={muse.handle}
          priceCents={muse.price_cents}
          subscribed={subscribed}
          signedIn={signedIn}
        />
      </div>
    </main>
  );
}
