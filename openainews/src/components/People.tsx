import { PEOPLE } from '../people.ts'

export function People() {
  return (
    <section className="people" aria-labelledby="people-hed">
      <h2 id="people-hed">The people behind GPT-6</h2>
      <div className="people-grid">
        {PEOPLE.map((person) => {
          const body = (
            <>
              <img src={person.photo} alt={person.alt} width={280} height={350} />
              <p className="people-name">{person.name}</p>
              <p className="people-role">{person.role}</p>
              <p className="people-bio">{person.bio}</p>
            </>
          )
          return person.href ? (
            <a
              key={person.id}
              className="people-card"
              href={person.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {body}
            </a>
          ) : (
            <article key={person.id} className="people-card">
              {body}
            </article>
          )
        })}
      </div>
    </section>
  )
}
