"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Probe = { ok: boolean; detail: string };
type Wallet = Probe & { address: string | null; balance: string | null };

type Launch = {
  id: string;
  triggerTweetId: string;
  requesterUsername: string;
  ticker: string | null;
  tokenName: string | null;
  sourceTweetUrl: string | null;
  status: string;
  transactionHash: string | null;
  tokenAddress: string | null;
  argusUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  totalLaunchMs: number | null;
  createdAt: string;
};

type StatusPayload = {
  probes: {
    x: Probe;
    argus: Probe;
    rpc: Probe;
    database: Probe;
    wallet: Wallet;
  };
  launches: Launch[];
};

function pill(ok: boolean): string {
  return ok ? "#3dd68c" : "#ff5d73";
}

function canRetry(row: Launch): boolean {
  return row.status === "FAILED" && !row.transactionHash;
}

export function Dashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/status", { credentials: "include" });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) {
      setAuthed(false);
      setError(`status ${res.status}`);
      return;
    }
    setAuthed(true);
    setData((await res.json()) as StatusPayload);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ secret }),
    });
    if (!res.ok) {
      setError("wrong admin secret");
      return;
    }
    setSecret("");
    await load();
  }

  async function retry(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/launches/${id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) setError(body.error ?? "retry refused");
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (authed === false) {
    return (
      <main style={{ maxWidth: 420, margin: "12vh auto", padding: 24 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Let’s Arc</h1>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>
          Private admin. Enter ADMIN_SECRET.
        </p>
        <form onSubmit={(e) => void login(e)}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#14181e",
              border: "1px solid #242b33",
              color: "inherit",
              marginBottom: 12,
            }}
          />
          <button
            type="submit"
            style={{
              background: "#ff6a00",
              color: "#111",
              border: 0,
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Open
          </button>
        </form>
        {error ? <p style={{ color: "#ff5d73" }}>{error}</p> : null}
      </main>
    );
  }

  if (!data) {
    return <main style={{ padding: 32, color: "var(--muted)" }}>Loading…</main>;
  }

  const { probes, launches } = data;
  const rows: Array<[string, Probe]> = [
    ["X Connection", probes.x],
    ["Argus", probes.argus],
    ["Arc RPC", probes.rpc],
    ["Database", probes.database],
    ["Launcher Wallet", probes.wallet],
  ];

  return (
    <main style={{ padding: "28px 32px 64px", maxWidth: 1280, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Let’s Arc</h1>
          <p style={{ color: "var(--muted)", marginTop: 6 }}>
            @letslauncharc → Argus Portal #7 / Arc 5042
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetch("/api/logout", { method: "POST", credentials: "include" }).then(() => load())}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid #242b33",
            padding: "8px 12px",
            cursor: "pointer",
            height: 36,
          }}
        >
          Lock
        </button>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 28,
        }}
      >
        {rows.map(([label, probe]) => (
          <article
            key={label}
            style={{
              background: "#14181e",
              border: "1px solid #242b33",
              padding: 16,
            }}
          >
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
            <div style={{ marginTop: 8, fontWeight: 700, color: pill(probe.ok) }}>
              {probe.ok ? "LIVE" : "DOWN"}
            </div>
            <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
              {probe.detail}
            </div>
          </article>
        ))}
      </section>

      <section
        style={{
          marginTop: 16,
          background: "#14181e",
          border: "1px solid #242b33",
          padding: 16,
        }}
      >
        <div style={{ color: "var(--muted)", fontSize: 12 }}>WALLET</div>
        <div style={{ marginTop: 8 }}>{probes.wallet.address ?? "not published"}</div>
        <div style={{ marginTop: 6, color: "var(--accent)" }}>
          {probes.wallet.balance ?? "—"}
        </div>
      </section>

      {error ? <p style={{ color: "#ff5d73" }}>{error}</p> : null}

      <h2 style={{ marginTop: 36, fontSize: 16 }}>Recent launches</h2>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "var(--muted)", textAlign: "left" }}>
              {[
                "user",
                "ticker",
                "name",
                "source",
                "status",
                "tx",
                "token",
                "argus",
                "latency",
                "error",
                "",
              ].map((h) => (
                <th key={h} style={{ padding: "8px 10px", borderBottom: "1px solid #242b33" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {launches.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: 20, color: "var(--muted)" }}>
                  No launch requests yet.
                </td>
              </tr>
            ) : (
              launches.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    @{row.requesterUsername}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.ticker ? `$${row.ticker}` : "—"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.tokenName ?? "—"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.sourceTweetUrl ? (
                      <a href={row.sourceTweetUrl} target="_blank" rel="noreferrer">
                        tweet
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.status}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.transactionHash ? (
                      <a
                        href={`https://arc-scan.org/tx/${row.transactionHash}`}
                        target="_blank" rel="noreferrer"
                      >
                        {row.transactionHash.slice(0, 10)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.tokenAddress ? row.tokenAddress.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.argusUrl ? (
                      <a href={row.argusUrl} target="_blank" rel="noreferrer">
                        open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {row.totalLaunchMs != null ? `${row.totalLaunchMs}ms` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #1b2128",
                      color: row.errorMessage ? "#ff5d73" : "var(--muted)",
                      maxWidth: 240,
                    }}
                  >
                    {row.errorMessage ?? row.errorCode ?? "—"}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #1b2128" }}>
                    {canRetry(row) ? (
                      <button
                        type="button"
                        disabled={busy === row.triggerTweetId}
                        onClick={() => void retry(row.triggerTweetId)}
                        style={{
                          background: "transparent",
                          color: "#f5c14a",
                          border: "1px solid #f5c14a",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        retry
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
