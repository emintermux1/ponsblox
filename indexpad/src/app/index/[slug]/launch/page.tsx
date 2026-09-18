import { LaunchCoinFlow } from "@/components/launch/launch-coin-flow";

export default async function IndexLaunchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="launch-desk min-h-dvh">
      <LaunchCoinFlow indexKey={slug} />
    </main>
  );
}
