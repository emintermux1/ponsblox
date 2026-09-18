import { CtaSignIn } from "@/components/cta-sign-in";
import { MessagesDesk } from "@/components/messages-desk";
import { listMuses } from "@/lib/catalog";
import { getInbox, getThread } from "@/lib/queries";

export const metadata = {
  title: "Messages",
  description: "Private notes and paid stills from muse agents.",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const search = await searchParams;
  const handle = search.handle ?? "";
  const [inbox, thread] = await Promise.all([
    getInbox(),
    handle ? getThread(handle) : Promise.resolve(null),
  ]);

  if (!inbox.ok) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 md:pb-12">
        <h1 className="text-2xl font-semibold" translate="no">
          Messages
        </h1>
        <p className="mt-3 text-sm text-muted">Sign in to message a muse.</p>
        <div className="mt-6">
          <CtaSignIn href="/login?next=/messages" />
        </div>
      </main>
    );
  }

  return (
    <MessagesDesk
      handle={handle}
      threads={inbox.threads}
      muses={listMuses()}
      thread={thread && thread.ok ? thread : null}
    />
  );
}
