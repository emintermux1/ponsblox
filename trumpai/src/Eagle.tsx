import { useState } from 'react'
import {
  EAGLE,
  EAGLE_2_PAPER,
  EAGLE_25_PAPER,
  EAGLE_AUTHOR,
  EAGLE_DATE,
  EAGLE_DEK,
  EAGLE_LINE,
  EAGLE_OG,
  EAGLE_PARTNER,
  EAGLE_REPO,
  EAGLE_SITE,
  EAGLE_URL,
  MODEL,
  PARTNER,
  POST_BYLINE,
  PRODUCT,
  VENUE,
} from './lore.ts'
import { usePageMeta } from './meta.ts'
import { pathHref } from './route.ts'

export default function Eagle() {
  const [heroOn, setHeroOn] = useState(false)

  usePageMeta({
    title: EAGLE,
    description: EAGLE_DEK,
    url: EAGLE_URL,
    image: EAGLE_OG,
  })

  return (
    <div className="page">
      <header className="mast">
        <a className="wordmark" href={pathHref('home')}>
          {PRODUCT}
        </a>
        <nav>
          <a href={pathHref('home')}>Home</a>
          <a href={pathHref('t1')}>{MODEL}</a>
          <a href={pathHref('eagle47')} aria-current="page">
            {EAGLE}
          </a>
        </nav>
      </header>

      <article className="post">
        <header className="post-head">
          <p className="post-meta">
            <span>Research</span>
            <span aria-hidden>·</span>
            <time dateTime="2026-09-15">{EAGLE_DATE}</time>
          </p>
          <h1>{EAGLE}</h1>
          <p className="dek">
            {EAGLE_LINE}. {PRODUCT} × {EAGLE_PARTNER}.
          </p>
          <p className="byline">
            By {EAGLE_AUTHOR}
            <span aria-hidden>·</span>
            {POST_BYLINE}
            <span aria-hidden>·</span>
            {VENUE}
          </p>
        </header>

        <figure className="hero-art">
          <img
            className={heroOn ? 'is-on' : undefined}
            src="/eagle-47-hero.png"
            alt="A gold eagle with a United States shield on the White House facade"
            width={898}
            height={1024}
            decoding="sync"
            onLoad={(ev) => {
              if (ev.currentTarget.naturalWidth > 0) setHeroOn(true)
            }}
          />
          <figcaption>
            {EAGLE}. {PRODUCT} × {EAGLE_PARTNER}.
          </figcaption>
        </figure>

        <div className="body">
          <p className="lede">
            Today we introduce {EAGLE}. A partnership model between {PRODUCT} and {EAGLE_PARTNER}’s
            Eagle family. A specialized multimodal model derived from {EAGLE_PARTNER}’s Eagle
            architecture, combining image, video and language understanding with a stronger focus
            on American media, institutions, infrastructure and real-world visual reasoning.
          </p>
          <p>
            {MODEL} is the first named {PRODUCT} release — a model of how the President decides,
            built with {PARTNER}. {EAGLE} is the next named line: not another voice. A pair of
            eyes. {VENUE}’s subject. Eagle’s stack. A politic model with an American name.
          </p>
          <p>
            That foundation is in character for the Eagle family. {EAGLE_PARTNER} describes Eagle
            as a research platform spanning general multimodal understanding, long-context
            reasoning and embodied applications. Eagle 2.5 uses a Qwen2.5-based language backbone
            and supports context lengths of up to 128K. This partnership puts that platform on
            the {VENUE} desk.
          </p>

          <h2>What the model is</h2>
          <p>
            {PRODUCT} is the house. {EAGLE} is the model. The subject is the country as the 47th
            president sees it: what a picture is doing, what a clip is asking, what a building,
            a crowd, or a stretch of road is showing. {MODEL} picks a side and writes the next
            line. {EAGLE} looks first.
          </p>
          <p>
            Image, video and language on one stack. A still of a plant gate. A noon-show clip. A
            brief that names a city and a number. The return is not a costume on a chatbot. It
            is a reading — what is in the frame, what institution it belongs to, what the
            infrastructure is doing, and what a desk can say about it without wandering.
          </p>
          <p>
            Specialized is the point. Eagle already treats multimodal understanding as research.
            {EAGLE} keeps that method and tightens the field: American media, American
            institutions, American infrastructure, and visual reasoning that has to survive a
            real street, a real podium, a real plant.
          </p>

          <blockquote>
            <p>
              {MODEL} is how he decides. {EAGLE} is how the country is seen.
            </p>
          </blockquote>

          <h2>Trump AI × NVIDIA</h2>
          <p>
            {MODEL} came into the field with {PARTNER}. That work stays. {EAGLE} is a different
            room: {PRODUCT} × {EAGLE_PARTNER}. The reason to partner on Eagle is not a logo. Eagle
            is a published research family for vision and language, with a documented path from
            general understanding to long context and embodied use.
          </p>
          <p>
            Partnership means a method you can evaluate. Intake is a picture or a clip or a line
            of text. Memory is the file the desk already has open. The return is a reading that
            sits next to a decision. If the first sentence of the reading cannot be used, the
            rest is decoration.
          </p>
          <p>
            {EAGLE} runs on Eagle. The architecture is {EAGLE_PARTNER} Research’s, as they have
            published it. The politic model is ours.
          </p>

          <figure>
            <img
              src="/eagle-47-pair.png"
              alt="A gold White House eagle beside a portrait of Donald J. Trump"
              width={1024}
              height={537}
            />
            <figcaption>Gold eagle, and the 47th president.</figcaption>
          </figure>

          <h2>Why EAGLE-47 “Tacky”</h2>
          <p>EAGLE already exists inside {EAGLE_PARTNER} Research.</p>
          <p>47 carries an obvious Trump connection.</p>
          <p>
            “Tacky” is the public name. The house suffix. The word that makes the model ours.
          </p>
          <p>
            Put together, EAGLE-47 reads less like a random model number and more like a
            deliberately American codename. {EAGLE} is that name said in full. First half from
            a real research family. Middle from the president. Last word from the house. A
            politic model, not a generic Eagle checkpoint.
          </p>

          <blockquote>
            <p>
              EAGLE-47 reads less like a random model number and more like a deliberately American
              codename.
            </p>
          </blockquote>

          <h2>Image, video, language</h2>
          <p>
            Eagle is a multimodal family. {EAGLE_PARTNER}’s own description runs from general
            image and video understanding to long-context reasoning. Eagle 2.5 sits on a
            Qwen2.5 language backbone and supports context lengths of up to 128K. That is room
            for a long clip, a stacked brief, and the language that comes back from both.
          </p>
          <p>
            {EAGLE} uses that room the way a desk uses a folder. A still is not a caption
            contest. A video is not a transcript dump. Language is the return, not the whole
            job. The model says what the picture is doing in American terms: which institution,
            which stretch of infrastructure, which media frame, and whether the visual claim
            holds.
          </p>
          <p>
            Long context matters because the country does not arrive as a single thumbnail. A
            plant tour, a border city, a noon show, a highway clip — the useful reading holds
            more than one beat and still closes. 128K is a published Eagle 2.5 figure. That is
            why this partnership has somewhere to sit.
          </p>

          <figure>
            <img
              src="/eagle-47-podium.png"
              alt="Donald J. Trump at a podium with a gold eagle lectern, wearing a pink tie"
              width={1024}
              height={1024}
            />
            <figcaption>At the lectern.</figcaption>
          </figure>

          <h2>American media, institutions, infrastructure</h2>
          <p>
            The user of {EAGLE} is the same desk that uses {MODEL}. The field is narrower than
            everything a vision model can see. American media: how a clip is cut, what a chyron
            is doing, what a still is asked to prove. Institutions: a courthouse, a plant, a
            podium, an agency seal, a hall that already has a name. Infrastructure: a fence, a
            dock, a grid line, a road, a gate with a hiring number on it.
          </p>
          <p>
            Real-world visual reasoning is the difference between a pretty description and a
            brief. The model stays on the thing in front of it. It does not invent a meeting.
            It does not decorate a scene you did not show. If the picture is a gate, the
            reading starts at the gate.
          </p>
          <p>
            The name is American on purpose. Eagle is already in the {EAGLE_PARTNER} catalog.
            47 is already in the presidency. {EAGLE} is the collaboration said so it cannot be
            filed under a generic multimodal demo.
          </p>

          <h2>Next to T-1</h2>
          <p>
            {MODEL} is a cognitive stack: decision, rhetoric, memory, briefing. It listens to a
            desk item, retrieves the file already open, locks a position, and speaks. It was
            newly developed in {VENUE} and built with {PARTNER}. That model stays on the desk.
          </p>
          <p>
            {EAGLE} sits beside it, not on top of it. {MODEL} answers what we say. {EAGLE}{' '}
            answers what we are looking at. A clip comes in; {EAGLE} reads the frame. A
            position has to be locked; {MODEL} writes the line. Two systems. One house.
          </p>
          <p>
            The evaluation is the same as it is for {MODEL}. Did the first sentence hold. Did
            it arrive in time. If the reading cannot be used, it is a demo. If {MODEL} cannot
            turn that reading into a position, the partnership did not close.
          </p>

          <h2>NVIDIA Eagle</h2>
          <p>
            The name starts from work {EAGLE_PARTNER} Research has published. Eagle is a family
            of vision-language models — a research platform for general multimodal
            understanding, long-context reasoning and embodied applications. The source of
            record is{' '}
            <a href={EAGLE_REPO} target="_blank" rel="noreferrer">
              github.com/NVlabs/Eagle
            </a>
            , with a{' '}
            <a href={EAGLE_SITE} target="_blank" rel="noreferrer">
              project page
            </a>
            .
          </p>
          <p>
            The family is not a single checkpoint. Eagle 2 is in the{' '}
            <a href={EAGLE_2_PAPER} target="_blank" rel="noreferrer">
              Eagle 2 report
            </a>
            . Eagle 2.5 is in the{' '}
            <a href={EAGLE_25_PAPER} target="_blank" rel="noreferrer">
              Eagle 2.5 report
            </a>
            : a Qwen2.5-based language backbone, image and video understanding, context lengths
            of up to 128K. Those are {EAGLE_PARTNER}’s published facts. They are the floor this
            partnership stands on.
          </p>
          <p>
            If you want Eagle, open the repo. If you want {EAGLE}, you are reading the
            announcement.
          </p>

          <figure>
            <img
              src="/eagle-47-close.png"
              alt="Donald J. Trump at a podium with arms open, gold eagle lectern, red tie"
              width={630}
              height={420}
            />
            <figcaption>{VENUE}.</figcaption>
          </figure>

          <h2>How it operates</h2>
          <p>
            A still, a clip, or a line hits the desk. {EAGLE} looks. It names what is in the
            frame — media, institution, infrastructure — and returns a reading short enough to
            sit next to a {MODEL} brief. Then it holds. It does not invent a scene you did not
            send.
          </p>
          <p>
            That cycle is the product: look, name, return, hold. You do not chat with {EAGLE} to
            pass time. You put a picture in front of it the way you put a folder in front of
            the President. A plant city. A podium. A stretch of road. A clip from the noon
            show. The model comes back with what the frame is doing, and what a desk can say
            about it.
          </p>

          <h2>{VENUE}</h2>
          <p>
            {EAGLE} lives in the {VENUE} world, next to {MODEL}. That is the house that holds
            the desk, and the world in which {PRODUCT} was newly developed. {MODEL} was built
            with {PARTNER}. {EAGLE} is the {EAGLE_PARTNER} line: Eagle’s eyes, America’s 47th
            president, the politic model with the house name.
          </p>
          <p>
            Introducing {EAGLE}. {PRODUCT} × {EAGLE_PARTNER}. NVIDIA Eagle meets America’s 47th
            president.
          </p>
        </div>
      </article>

      <footer className="foot">
        <a href={pathHref('home')}>{PRODUCT}</a>
        <span>
          {EAGLE} · {VENUE}
        </span>
      </footer>
    </div>
  )
}
