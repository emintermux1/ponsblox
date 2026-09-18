import { RouteEmpty } from "@/components/route-shell";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <RouteEmpty
        kicker="404"
        title="This ticket is not on the book"
        body="The route does not exist. Create an index, or explore live baskets when the catalog answers."
        actionHref="/"
        actionLabel="Back to INDEXPAD"
      />
    </main>
  );
}
