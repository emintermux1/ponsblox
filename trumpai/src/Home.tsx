import { CLAIM, EAGLE, EAGLE_HERO, EAGLE_LINE, HOME_URL, MODEL, PARTNER, PRODUCT, SYSTEMS, VENUE, lobeLabel } from './lore.ts'
import { usePageMeta } from './meta.ts'
import { pathHref } from './route.ts'

export default function Home() {
  usePageMeta({
    title: 'Trump T1',
    description: CLAIM,
    url: HOME_URL,
    image: 'https://trumpai.news/hero.png',
  })

  return (
    <div className="home">
      <header className="home-nav">
        <a className="wordmark" href={pathHref('home')}>
          {PRODUCT}
        </a>
        <nav>
          <a href={pathHref('t1')}>Introducing {MODEL}</a>
          <a href={pathHref('eagle47')}>{EAGLE}</a>
        </nav>
      </header>

      <section className="home-hero">
        <p className="kicker">
          <span className="dot" aria-hidden />
          {PRODUCT} · with {PARTNER}
        </p>
        <h1>{MODEL}</h1>
        <p className="lead">{CLAIM}</p>
        <a className="home-cta" href={pathHref('t1')}>
          Read the introduction
        </a>
      </section>

      <figure className="home-art">
        <img
          src="/hero.png"
          alt="A humanoid robot standing beside Donald J. Trump"
          width={1600}
          height={1600}
        />
      </figure>

      <section className="home-copy">
        <p className="eyebrow">{VENUE}</p>
        <h2>Trump’s brain, on the desk.</h2>
        <p>
          {PRODUCT} is a cognitive model of Donald J. Trump — newly developed in {VENUE} and built
          with {PARTNER}. {MODEL} is the first named release: decision, rhetoric, memory, briefing.
          One stack. One brain.
        </p>
      </section>

      <section className="home-systems">
        <div className="home-systems-head">
          <p className="eyebrow">{MODEL}</p>
          <h2>Four systems. One brain.</h2>
        </div>
        <ol>
          {SYSTEMS.map((sys) => (
            <li key={sys.lobe}>
              <p className="eyebrow">{lobeLabel(sys.lobe)}</p>
              <h3>{sys.title}</h3>
              <p>{sys.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-feature">
        <a href={pathHref('eagle47')}>
          <figure>
            <img
              src={EAGLE_HERO}
              alt="A gold eagle with a United States shield on the White House facade"
              width={898}
              height={1024}
            />
          </figure>
          <p className="kicker">
            <span className="dot" aria-hidden />
            {PRODUCT} × NVIDIA
          </p>
          <h2>{EAGLE}</h2>
          <p className="lead">{EAGLE_LINE}</p>
          <span className="home-cta">Read the introduction</span>
        </a>
      </section>

      <footer className="home-foot">
        <div>
          <a href={pathHref('t1')}>Introducing {MODEL}</a>
          <a href={pathHref('eagle47')}>{EAGLE}</a>
        </div>
        <span>
          {VENUE} · with {PARTNER}
        </span>
      </footer>
    </div>
  )
}
