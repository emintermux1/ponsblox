import { getLeaderboardPeople } from "@/lib/services/people";

import { ConnectView } from "./connect-view";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const directory = await getLeaderboardPeople().catch(() => []);
  return <ConnectView initialDirectory={directory} />;
}
