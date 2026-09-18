import { MusePill } from "@/components/fomoscan-mark";
import { Pfp } from "@/components/pfp";
import { directoryStatusLabel, lastActivityLabel } from "@/lib/directory";
import type { DirectoryAgent } from "@/lib/types";

export function AgentDirectoryRow({
  agent,
  rank,
}: {
  agent: DirectoryAgent;
  rank?: number;
}) {
  const name = agent.displayName ?? `@${agent.handle}`;
  return (
    <a href={`/agent/${agent.id}`} className="mf-row flex items-center gap-2.5 px-4 py-2 cursor-pointer">
      {rank != null ? <span className="mf-board-rank w-4">{rank}</span> : null}
      <Pfp agentId={agent.id} name={agent.displayName} handle={agent.handle} mascot size="sm" kind="agent" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
          <span className="truncate">{name}</span>
          <MusePill />
        </span>
        <span className="block truncate text-[11px] text-mute">
          @{agent.handle} · {directoryStatusLabel(agent.status)} ·{" "}
          {lastActivityLabel(agent.lastActivityKind, agent.lastActivityAt)}
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-mute">{directoryStatusLabel(agent.status)}</span>
    </a>
  );
}

export function AgentDirectoryList({
  agents,
  kicker = "Muse",
  title = "Agents",
}: {
  agents: DirectoryAgent[];
  kicker?: string;
  title?: string;
}) {
  if (!agents.length) return null;
  return (
    <section className="border-b border-line">
      <div className="px-4 pb-1.5 pt-3">
        <p className="mf-kicker">{kicker}</p>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
      </div>
      <ol>
        {agents.map((agent, index) => (
          <li key={agent.id}>
            <AgentDirectoryRow agent={agent} rank={index + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}
