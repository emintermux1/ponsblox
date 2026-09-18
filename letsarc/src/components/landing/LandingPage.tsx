import { OrbitField } from "./OrbitField";
import { WordCycle } from "./WordCycle";

const X_BOT = "https://x.com/letslauncharc";
const ARGUS = "https://argus.world";

const STATS = [
  { value: "1 reply", label: "from command to launch" },
  { value: "5042", label: "Arc mainnet" },
  { value: "Portal #7", label: "live Argus factory" },
  { value: "0 LLM", label: "in the launch path" },
  { value: "1 tweet", label: "never mints twice" },
];

export function LandingPage() {
  const ticker = [...STATS, ...STATS];

  return (
    <div className="landing">
      <div className="grid-bg" />

      <header className="wrap site-header">
        <a className="brand" href="/">
          Let’s Arc <small>TM</small>
        </a>
        <nav className="nav-mid">
          <a href="#launch">Launch</a>
          <a href="#how">How it works</a>
          <a href="#trust">Trust</a>
        </nav>
        <div className="nav-end">
          <a className="btn btn-ghost" href={ARGUS} target="_blank" rel="noreferrer">
            Argus
          </a>
          <a className="btn btn-ink" href={X_BOT} target="_blank" rel="noreferrer">
            Reply to launch
          </a>
        </div>
      </header>

      <section className="wrap hero">
        <div>
          <h1>
            The reply
            <br />
            {"to "}
            <WordCycle />
          </h1>
          <p className="hero-lead">
            Mention @letslauncharc on any X post with a ticker and a name.
            We sign a real Argus transaction on Arc and reply with the live
            token URL.
          </p>
          <div className="hero-actions">
            <a className="btn btn-ink btn-lg" href={X_BOT} target="_blank" rel="noreferrer">
              Start on X
              <span aria-hidden="true">→</span>
            </a>
            <a className="btn btn-ghost btn-lg" href="#how">
              See the command
            </a>
          </div>
        </div>
        <OrbitField />
      </section>

      <section className="marquee" aria-label="Product facts">
        <div className="marquee-track">
          {ticker.map((item, i) => (
            <div className="stat" key={`${item.label}-${i}`}>
              <b>{item.value}</b>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section" id="launch">
        <div className="kicker">Capabilities</div>
        <h2>Everything you need. Nothing you don’t.</h2>
        <p className="section-lead">
          A dedicated launcher wallet sends a real Portal #7 launch on Arc.
          No mock pools. No invented contract addresses.
        </p>
        <div className="cards">
          <article className="card">
            <div className="node"><i /></div>
            <h3>One reply</h3>
            <p>
              @letslauncharc $TICKER Coin Name. Deterministic parse. Mentions
              and links are stripped before anything is signed.
            </p>
          </article>
          <article className="card">
            <div className="node"><i /></div>
            <h3>Real Argus pool</h3>
            <p>
              Wallet-signed portal.launch on Arc 5042. The bot replies with
              the live argus.world/token URL after confirmation.
            </p>
          </article>
          <article className="card">
            <div className="node"><i /></div>
            <h3>Source kept</h3>
            <p>
              The parent tweet, author, text, and image travel with the
              launch. The coin stays attached to the post that started it.
            </p>
          </article>
          <article className="card">
            <div className="node"><i /></div>
            <h3>Once, only once</h3>
            <p>
              Trigger tweet ID is unique in Postgres. If a hash exists we
              reconcile it. We never blindly send a second transaction.
            </p>
          </article>
        </div>
      </section>

      <section className="wrap section" id="how">
        <div className="kicker">Flow</div>
        <h2>Three steps. A live coin.</h2>
        <div className="how-grid">
          <div>
            <div className="step">
              <strong><em>I</em> Reply to any post</strong>
              <p>The mention must be a reply. Quote-tweets and root posts are ignored.</p>
            </div>
            <div className="step">
              <strong><em>II</em> We read the command</strong>
              <p>Ticker, name, requester, and the source tweet are resolved before any chain call.</p>
            </div>
            <div className="step">
              <strong><em>III</em> Argus answers</strong>
              <p>@letslauncharc replies with $TICKER is live and the real token URL.</p>
            </div>
          </div>
          <div className="thread">
            <div className="thread-label">command.ts</div>
            <div className="tweet">
              <b>anyone</b>
              <p>look at this dog</p>
            </div>
            <div className="tweet">
              <b>you</b>
              <p>@letslauncharc $DOG CAT Dog Cat</p>
            </div>
            <div className="tweet">
              <b>letslauncharc</b>
              <p>
                $DOG is live.
                <br />
                <a href={ARGUS} target="_blank" rel="noreferrer">
                  https://argus.world/token/…
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap section" id="trust">
        <div className="kicker">Security</div>
        <h2>Trust is non-negotiable.</h2>
        <p className="section-lead">
          This process controls a funded wallet. The critical path is code,
          not a model.
        </p>
        <div className="trust-grid">
          <article className="trust">
            <h3>Allowlisted destination</h3>
            <p>Only Arc 5042, Portal #7, method launch, value 0.</p>
          </article>
          <article className="trust">
            <h3>Server-side signing</h3>
            <p>The private key never reaches the browser or the admin page.</p>
          </article>
          <article className="trust">
            <h3>Untrusted tweets</h3>
            <p>Input is parsed, never executed. No prompt injection in the launch path.</p>
          </article>
          <article className="trust">
            <h3>Reconcile first</h3>
            <p>Lost RPC responses are recovered from the hash. No second mint.</p>
          </article>
        </div>
      </section>

      <section className="wrap cta-block">
        <h2>
          Ready to launch
          <br />
          something?
        </h2>
        <p>Reply to any post. Use a ticker and a name. The rest is a real transaction.</p>
        <div className="cta-row">
          <a className="btn btn-ink btn-lg" href={X_BOT} target="_blank" rel="noreferrer">
            Open @letslauncharc
          </a>
          <a className="btn btn-ghost btn-lg" href={ARGUS} target="_blank" rel="noreferrer">
            Open Argus
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <a className="brand" href="/">
              Let’s Arc <small>TM</small>
            </a>
            <p>Turn any X post into a real Argus coin with one reply.</p>
          </div>
          <div>
            <h3>Product</h3>
            <ul>
              <li><a href="#launch">Launch</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#trust">Trust</a></li>
            </ul>
          </div>
          <div>
            <h3>Network</h3>
            <ul>
              <li><a href={ARGUS} target="_blank" rel="noreferrer">Argus</a></li>
              <li><a href="https://arc-scan.org" target="_blank" rel="noreferrer">Arcscan</a></li>
              <li><a href={X_BOT} target="_blank" rel="noreferrer">@letslauncharc</a></li>
            </ul>
          </div>
          <div>
            <h3>Ops</h3>
            <ul>
              <li><a href="/admin">Admin</a></li>
            </ul>
          </div>
        </div>
        <div className="wrap copy">Let’s Arc. Reply to launch on Arc.</div>
      </footer>
    </div>
  );
}
