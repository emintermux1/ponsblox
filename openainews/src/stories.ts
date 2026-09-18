import { articleHref, type ArticleId, type SectionId } from './routes.ts'

export type Story = {
  id: string
  section: SectionId
  kicker: string
  headline: string
  dek: string
  dateLabel: string
  datetime: string
  source: string
  href: string
  external: boolean
}

export const FEATURE_ARTICLE_ID: ArticleId = 'gpt-6-1-alpha'

export const FEATURE_STORY: Story = {
  id: 'gpt-6-1-alpha',
  section: 'models',
  kicker: 'Models',
  headline: 'OpenAI’s next model appears to be called GPT-6.1 Alpha',
  dek: 'A new model identifier points to “Alpha” as the first major iteration of OpenAI’s GPT-6 generation following the release of GPT-6 Astra.',
  dateLabel: 'September 12, 2026',
  datetime: '2026-09-12',
  source: 'OpenAI News',
  href: articleHref(FEATURE_ARTICLE_ID),
  external: false,
}

export const STORIES: Story[] = [
  FEATURE_STORY,
  {
    id: 'scaling-storage',
    section: 'research',
    kicker: 'Research',
    headline: 'Rapidly scaling online storage to serve over 1 billion ChatGPT users',
    dek: 'How OpenAI adapted Habitat, its Python application storage platform, to manage more than 70 million requests a second.',
    dateLabel: 'September 11, 2026',
    datetime: '2026-09-11',
    source: 'OpenAI',
    href: 'https://openai.com/index/scaling-storage-one-billion-users-part-one/',
    external: true,
  },
  {
    id: 'alien-mind',
    section: 'research',
    kicker: 'Research',
    headline: 'An Alien Mind',
    dek: 'Chief Scientist Jakub Pachocki on increasingly capable systems, alignment, and the case for shared safety bars.',
    dateLabel: 'September 6, 2026',
    datetime: '2026-09-06',
    source: 'OpenAI',
    href: 'https://openai.com/index/an-alien-mind/',
    external: true,
  },
  {
    id: 'gpt-6-astra',
    section: 'models',
    kicker: 'Models',
    headline: 'GPT-6 Astra: A new generation of intelligence',
    dek: 'OpenAI’s new frontier model, with major gains in computer use, browsing, software engineering, cybersecurity, science and professional work.',
    dateLabel: 'September 3, 2026',
    datetime: '2026-09-03',
    source: 'OpenAI',
    href: 'https://openai.com/index/gpt-6-astra/',
    external: true,
  },
  {
    id: 'safety-overview',
    section: 'models',
    kicker: 'Safety',
    headline: 'Safety overview: GPT-6 Astra',
    dek: 'Astra is the first OpenAI model broadly deployed at the Critical cybersecurity capability threshold under the Preparedness Framework.',
    dateLabel: 'September 3, 2026',
    datetime: '2026-09-03',
    source: 'OpenAI',
    href: 'https://openai.com/index/safety-overview-gpt-6-astra/',
    external: true,
  },
  {
    id: 'leadership',
    section: 'company',
    kicker: 'Company',
    headline: 'Leadership updates',
    dek: 'Mark Chen stepped into an expanded role as Chief Research Officer, with Brad Lightcap and Julia Villagra taking on broader operating and people roles.',
    dateLabel: 'March 24, 2025',
    datetime: '2025-03-24',
    source: 'OpenAI',
    href: 'https://openai.com/index/leadership-updates-march-2025/',
    external: true,
  },
  {
    id: 'product-releases',
    section: 'models',
    kicker: 'Product',
    headline: 'Product Releases',
    dek: 'OpenAI’s official newsroom index for product launches, model releases and ChatGPT updates.',
    dateLabel: 'OpenAI Newsroom',
    datetime: '2026-09-12',
    source: 'OpenAI',
    href: 'https://openai.com/news/product-releases/',
    external: true,
  },
]

export function otherHomeStories() {
  return STORIES.filter((story) => story.id !== FEATURE_STORY.id)
}

export function storiesForSection(id: SectionId) {
  return STORIES.filter((story) => story.section === id)
}
