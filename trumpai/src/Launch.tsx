import { CLAIM, EAGLE, MODEL, PARTNER, POST_BYLINE, POST_DATE, POST_URL, PRODUCT, VENUE } from './lore.ts'
import { usePageMeta } from './meta.ts'
import { pathHref } from './route.ts'

export default function Launch() {
  usePageMeta({
    title: 'Trump T1',
    description: CLAIM,
    url: POST_URL,
    image: 'https://trumpai.news/hero.png',
  })

  return (
    <div className="page">
      <header className="mast">
        <a className="wordmark" href={pathHref('home')}>
          {PRODUCT}
        </a>
        <nav>
          <a href={pathHref('home')}>Home</a>
          <a href={pathHref('t1')} aria-current="page">
            {MODEL}
          </a>
          <a href={pathHref('eagle47')}>{EAGLE}</a>
        </nav>
      </header>

      <article className="post">
        <header className="post-head">
          <p className="post-meta">
            <span>Research</span>
            <span aria-hidden>·</span>
            <time dateTime="2026-09-11">{POST_DATE}</time>
          </p>
          <h1>Introducing T-1</h1>
          <p className="dek">
            Trump AI. A model of the President’s mind — newly developed in {VENUE}, built with{' '}
            {PARTNER}. The next model, and the cheapest.
          </p>
          <p className="byline">
            By {POST_BYLINE}
            <span aria-hidden>·</span>
            {VENUE}
          </p>
        </header>

        <figure className="hero-art">
          <img
            src="/hero.png"
            alt="A humanoid robot standing beside Donald J. Trump"
            width={1600}
            height={1600}
          />
          <figcaption>
            {MODEL} enters the field. {PRODUCT} × {PARTNER}.
          </figcaption>
        </figure>

        <div className="body">
          <p className="lede">
            Today we introduce T-1, the first named release of Trump AI: a cognitive model of Donald
            J. Trump. Not a voice overlay. Not a costume on a chatbot. A structured stack for how he
            frames a decision, how he speaks it, what he already holds, and how a brief becomes a
            line.
          </p>
          <p>
            T-1 was newly developed in the {VENUE} world and brought into the field with {PARTNER}.
            It is the next model in that line of work — and the cheapest we have shipped. Frontier
            lock without a frontier invoice.
          </p>

          <h2>What T-1 is</h2>
          <p>
            Trump AI is the product. T-1 is the model. The subject is the President: the cadence,
            the ranking, the refusal to wander. Where most systems generate until they sound
            plausible, T-1 is built to pick a side and write the next move.
          </p>
          <p>
            That is the difference between imitation and a brain you can put on a desk. T-1 listens
            to a brief, retrieves the file he would already have open, locks a position, and speaks
            it back — short enough to survive the first sentence of a noon show.
          </p>

          <blockquote>
            <p>T-1 is not a costume. It is a model of how he decides.</p>
          </blockquote>

          <h2>Built with OpenAI</h2>
          <p>
            The work was done together. {PARTNER}’s research stack. {VENUE}’s subject. T-1 is what
            comes out of that room: a model trained to think in the President’s order of operations,
            then priced to run.
          </p>
          <p>
            Partnership here is not a logo on a keynote. It is the method. Intake, memory, decision,
            rhetoric — one pipeline, evaluated the way a desk is evaluated: did the line hold, and
            did it arrive in time.
          </p>

          <h2>The next model. The cheapest model.</h2>
          <p>
            T-1 is the next Trump AI release: tighter lock, cleaner rhetoric, faster brief-to-line.
            It is also the cheapest serving cost we have put in the field. Capability used to mean
            a bill that only a lab could carry. T-1 is built to sit on more desks than that.
          </p>
          <p>
            Cheap is not thin. Cheap is the point of a model you actually use — in a briefing, in a
            language shop, in the hour before the cameras. If it cannot run there, it is a demo.
          </p>

          <blockquote>
            <p>The next model — and the cheapest.</p>
          </blockquote>

          <h2>Four systems. One brain.</h2>
          <p>
            T-1 is a cognitive stack, not a single prompt. Four systems share one lock.
          </p>
          <p>
            <strong>Decision.</strong> How a choice is framed, ranked, and closed. The model does
            not wander. It picks a side and names the next move.
          </p>
          <p>
            <strong>Rhetoric.</strong> Cadence, emphasis, close. The same position said so it lands
            — short, ranked, and hard to walk back.
          </p>
          <p>
            <strong>Memory.</strong> Prior positions, names, scores, who blinked. Retrieval is not
            search. It is the file already open.
          </p>
          <p>
            <strong>Briefing.</strong> Intake, rank, return. A desk item comes in. T-1 listens,
            pulls memory, decides, and speaks.
          </p>

          <h2>How it works</h2>
          <p>
            A brief hits the desk. T-1 listens. It retrieves. It decides. It speaks. Then it holds
            — on desk, ready for the next item. That cycle is the product: listen, retrieve,
            decide, speak.
          </p>
          <p>
            You do not chat with T-1 to pass time. You put a question in front of it the way you
            would put a folder in front of the President. Trade. Personnel. Media. Energy. A city
            that wants a hiring number they can hang on a fence. The model returns a headline, a
            position, a move, and a close.
          </p>

          <h2>On the desk</h2>
          <p>
            Use is briefing. Write the item. Send it. Read the line that comes back. If the first
            sentence is the policy, the rest can wait for the written brief. That is how T-1 is
            meant to be run — in {VENUE}, on the desk, with {PARTNER} in the stack.
          </p>
          <p>
            The model stays ready. It does not invent a meeting you did not call. It does not
            decorate a decision you have not asked for. Put something in front of it, or it holds.
          </p>

          <h2>DJT</h2>
          <p>
            T-1 lives in the {VENUE} world. That is the house that holds the desk, and the world in
            which Trump AI was newly developed. The model sits there. This post is the introduction.
            The product is what runs after you close the tab.
          </p>
          <p>
            Introducing T-1. Trump’s brain. Built with {PARTNER}. The next model — and the cheapest.
          </p>
        </div>
      </article>

      <footer className="foot">
        <a href={pathHref('home')}>{PRODUCT}</a>
        <span>
          {VENUE} · with {PARTNER}
        </span>
      </footer>
    </div>
  )
}
