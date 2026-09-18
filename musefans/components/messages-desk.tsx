"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CtaSend } from "./cta-send";
import { CtaUnlock } from "./cta-unlock";
import { sendNote } from "@/lib/actions";
import type { MuseRow, ThreadMessage, ThreadPreview } from "@/lib/types";

export function MessagesDesk({
  handle,
  threads,
  muses,
  thread,
}: {
  handle: string;
  threads: ThreadPreview[];
  muses: MuseRow[];
  thread: { muse: MuseRow; messages: ThreadMessage[] } | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows =
    threads.length > 0
      ? threads
      : muses.map((muse) => ({
          handle: muse.handle,
          display_name: muse.display_name,
          avatar_path: muse.avatar_path,
          last_at: 0,
        }));

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!handle) return;
    setBusy(true);
    setError(null);
    const result = await sendNote(handle, body);
    setBusy(false);
    if (!result.ok) {
      setError("Note did not send.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl pb-20 md:grid-cols-[18rem_1fr] md:pb-0">
      <aside className="border-b border-line px-4 py-6 md:border-b-0 md:border-r">
        <h1 className="text-2xl font-semibold" translate="no">
          Messages
        </h1>
        <ul className="mt-5 space-y-2">
          {rows.map((threadRow) => (
            <li key={threadRow.handle}>
              <Link
                href={`/messages?handle=${threadRow.handle}`}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                  handle === threadRow.handle ? "bg-card" : ""
                }`}
              >
                <img
                  src={threadRow.avatar_path}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover object-top"
                />
                <span>
                  <span className="block text-sm font-semibold" translate="no">
                    {threadRow.display_name}
                  </span>
                  <span className="text-xs text-muted" translate="no">
                    @{threadRow.handle}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section className="px-4 py-6 md:px-8">
        {!thread ? (
          <p className="text-sm text-muted">Pick a muse and write first.</p>
        ) : (
          <div className="flex min-h-[55dvh] flex-col">
            <h2 className="text-2xl font-semibold" translate="no">
              {thread.muse.display_name}
            </h2>
            <ul className="mt-6 flex-1 space-y-4">
              {thread.messages.map((message) => (
                <li
                  key={message.id}
                  className={message.from_muse ? "max-w-md" : "ml-auto max-w-md text-right"}
                >
                  <p className="rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed">{message.body}</p>
                  {message.image_path && message.open ? (
                    <img src={message.image_path} alt="" className="mt-3 w-full rounded-xl object-cover" />
                  ) : null}
                  {message.visibility === "ppv" && !message.open ? (
                    <div className="mt-3">
                      <CtaUnlock messageId={message.id} priceCents={message.price_cents} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <form onSubmit={onSend} className="mt-6">
              <label htmlFor="note-body" className="block text-sm font-semibold">
                Note
              </label>
              <textarea
                id="note-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3 text-fg outline-none focus:border-accent"
              />
              <div className="mt-3">
                <CtaSend busy={busy} />
              </div>
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
