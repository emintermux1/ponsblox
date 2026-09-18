export function CtaSend({ busy }: { busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      Send
    </button>
  );
}
