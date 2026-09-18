import type { ArticleId } from './routes.ts'

export type ArticleBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'pull'; text: string }
  | { kind: 'name'; text: string }
  | { kind: 'aside'; text: string }

export type FeatureArticle = {
  id: ArticleId
  kicker: string
  headline: string
  dek: string
  dateLabel: string
  datetime: string
  read: string
  body: ArticleBlock[]
  sources: { label: string; href: string }[]
}

export const FEATURE: FeatureArticle = {
  id: 'gpt-6-1-alpha',
  kicker: 'Models',
  headline: 'OpenAI’s next model appears to be called GPT-6.1 Alpha',
  dek: 'A new model identifier points to “Alpha” as the first major iteration of OpenAI’s GPT-6 generation following the release of GPT-6 Astra.',
  dateLabel: 'September 12, 2026',
  datetime: '2026-09-12',
  read: '4 min read',
  body: [
    {
      kind: 'p',
      text: 'OpenAI may already be moving beyond GPT-6 Astra.',
    },
    {
      kind: 'p',
      text: 'A new model identifier, gpt-6.1-alpha, has surfaced around what appears to be an upcoming iteration of the GPT-6 family.',
    },
    {
      kind: 'p',
      text: 'The name is simple:',
    },
    {
      kind: 'name',
      text: 'GPT-6.1 Alpha',
    },
    {
      kind: 'p',
      text: 'The identifier points to Alpha being positioned as an evolution of GPT-6 rather than an entirely new model generation.',
    },
    {
      kind: 'p',
      text: 'That would make it one of the first major follow-ups to Astra, which OpenAI released on September 3.',
    },
    {
      kind: 'p',
      text: 'OpenAI introduced GPT-6 Astra as its new generation of frontier intelligence, with major improvements across computer use, browsing, software engineering, cybersecurity, science and professional work. The company also exposed Astra to developers under the API identifier gpt-6-astra.',
    },
    {
      kind: 'p',
      text: 'Only nine days later, attention is already shifting toward what comes next.',
    },
    {
      kind: 'pull',
      text: 'ALPHA',
    },
    {
      kind: 'p',
      text: 'The 6.1 designation would suggest OpenAI is keeping the GPT-6 generation intact while iterating on the underlying system.',
    },
    {
      kind: 'p',
      text: 'The Alpha name is the more interesting part.',
    },
    {
      kind: 'p',
      text: 'OpenAI’s latest public model families have increasingly used names alongside version numbers. GPT-5.6 introduced Sol, Terra and Luna, while GPT-6 arrived under the Astra name.',
    },
    {
      kind: 'p',
      text: 'Alpha would fit naturally into that new naming structure while signaling something different from Astra.',
    },
    {
      kind: 'p',
      text: 'If the identifier reaches production unchanged, users could see the model presented publicly as either:',
    },
    {
      kind: 'name',
      text: 'GPT-6.1 Alpha',
    },
    {
      kind: 'aside',
      text: 'or simply:',
    },
    {
      kind: 'name',
      text: 'Alpha',
    },
    {
      kind: 'p',
      text: 'with gpt-6.1-alpha used by developers.',
    },
    {
      kind: 'h2',
      text: 'The timing is unusually fast',
    },
    {
      kind: 'p',
      text: 'Astra is barely out.',
    },
    {
      kind: 'p',
      text: 'OpenAI released GPT-6 Astra on September 3 and has spent the days since expanding access across ChatGPT, Codex and the API. OpenAI currently describes GPT-6 Pro as being powered by GPT-6 Astra.',
    },
    {
      kind: 'p',
      text: 'The company is moving quickly enough that another GPT-6 branch entering testing this early would not necessarily imply Astra is being replaced.',
    },
    {
      kind: 'p',
      text: 'Instead, Alpha could represent the next checkpoint in the same generation.',
    },
    {
      kind: 'p',
      text: 'OpenAI already used a similar rapid-release strategy throughout GPT-5.x, iterating models while maintaining the larger generation.',
    },
    {
      kind: 'name',
      text: 'GPT-5.6  →  GPT-6 Astra  →  GPT-6.1 Alpha',
    },
    {
      kind: 'p',
      text: 'If that sequence holds, OpenAI’s model cadence is accelerating again.',
    },
    {
      kind: 'h2',
      text: 'Why “Alpha” matters',
    },
    {
      kind: 'p',
      text: 'Internal model names usually disappear into API documentation.',
    },
    {
      kind: 'p',
      text: 'Alpha doesn’t.',
    },
    {
      kind: 'p',
      text: 'It is short, instantly recognizable and unusually clean for a frontier model name.',
    },
    {
      kind: 'p',
      text: 'The word also carries an obvious meaning in software development: the earliest stage of something new.',
    },
    {
      kind: 'p',
      text: 'That makes GPT-6.1 Alpha an unusually fitting name for what could be OpenAI’s first major post-Astra experiment.',
    },
    {
      kind: 'p',
      text: 'Whether Alpha ultimately ships under that exact branding is another question.',
    },
    {
      kind: 'p',
      text: 'But the identifier itself gives the clearest look yet at where the GPT-6 family could be heading next.',
    },
  ],
  sources: [
    { label: 'GPT-6 Astra', href: 'https://openai.com/index/gpt-6-astra/' },
    { label: 'Safety Overview', href: 'https://openai.com/index/safety-overview-gpt-6-astra/' },
    { label: 'Product Releases', href: 'https://openai.com/news/product-releases/' },
    { label: 'An Alien Mind', href: 'https://openai.com/index/an-alien-mind/' },
    { label: 'Leadership Updates', href: 'https://openai.com/index/leadership-updates-march-2025/' },
    {
      label: 'Scaling Storage',
      href: 'https://openai.com/index/scaling-storage-one-billion-users-part-one/',
    },
  ],
}

export function getArticle(id: ArticleId): FeatureArticle {
  switch (id) {
    case 'gpt-6-1-alpha':
      return FEATURE
    default: {
      const _never: never = id
      return _never
    }
  }
}
