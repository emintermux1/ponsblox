import { articleHref, type ArticleId, type SectionId } from './routes.ts'

export type StoryKind = 'feature' | 'wire'

export type Story = {
  id: string
  kind: StoryKind
  section: SectionId
  kicker: string
  headline: string
  dek: string
  dateLabel: string
  datetime: string
  source: string
  href: string
  external: boolean
  image?: { src: string; alt: string }
  byline?: string
}

export const FEATURE_ARTICLE_ID: ArticleId = 'trump-unveils-gains-index'
export const CRYPTO_ARTICLE_ID: ArticleId = 'inside-the-white-house-crypto-meeting'

export const FEATURE_STORY: Story = {
  id: 'trump-unveils-gains-index',
  kind: 'feature',
  section: 'markets',
  kicker: 'Markets',
  headline: 'Trump announces new “Department of Gains” focused on U.S. markets and economic growth',
  dek: 'White House unveils new economic initiative and “Gains Index” tracking U.S. stocks, technology, memecoins and digital assets.',
  dateLabel: 'Sept. 17, 2026',
  datetime: '2026-09-17',
  source: 'DJT News',
  href: articleHref(FEATURE_ARTICLE_ID),
  external: false,
  byline: 'Alex Mercer',
}

export const CRYPTO_STORY: Story = {
  id: 'inside-the-white-house-crypto-meeting',
  kind: 'feature',
  section: 'markets',
  kicker: 'Markets',
  headline: 'Trump, Tenev and the Market That Never Really Closes',
  dek: 'Robinhood’s CEO came to the White House talking about ownership. The conversation quickly widened to Trump Accounts, round-the-clock trading and what a new generation expects from financial markets.',
  dateLabel: 'Aug. 19, 2026',
  datetime: '2026-08-19',
  source: 'DJT News',
  href: articleHref(CRYPTO_ARTICLE_ID),
  external: false,
  image: {
    src: '/hero-meeting.png',
    alt: 'President Donald Trump speaking beside Vlad Tenev at a White House podium',
  },
  byline: 'Alex Mercer',
}

export const STORIES: Story[] = [
  FEATURE_STORY,
  CRYPTO_STORY,
  {
    id: 'ireland-visit',
    kind: 'wire',
    section: 'politics',
    kicker: 'Politics',
    headline: 'Trump arrives in Ireland for talks before the Irish Open',
    dek: 'The president is meeting Ireland’s president and prime minister in Dublin before traveling to his golf club in Doonbeg, the Associated Press reported.',
    dateLabel: 'Sept. 12, 2026',
    datetime: '2026-09-12',
    source: 'Associated Press',
    href: 'https://wtop.com/world/2026/09/trump-will-meet-with-irelands-leaders-before-heading-to-his-golf-club-in-doonbeg/',
    external: true,
  },
  {
    id: 'china-cars',
    kind: 'wire',
    section: 'markets',
    kicker: 'Markets',
    headline: 'Trump says he would be open to Chinese automakers building cars in the U.S.',
    dek: 'Speaking after a week of midterm politics, the president said he would accept Chinese plants in the United States if they hired American workers.',
    dateLabel: 'Sept. 12, 2026',
    datetime: '2026-09-12',
    source: 'Reuters',
    href: 'https://www.reuters.com/world/us/trump-says-he-would-be-ok-with-china-building-cars-us-2026-09-12/',
    external: true,
  },
  {
    id: 'midterm-takeaways',
    kind: 'wire',
    section: 'politics',
    kicker: 'Politics',
    headline: 'Five takeaways from the Republican midterm convention in Dallas',
    dek: 'Reuters reports the two-day gathering treated November as a referendum on the president, including a promised $5,000 “Trump dividend.”',
    dateLabel: 'Sept. 11, 2026',
    datetime: '2026-09-11',
    source: 'Reuters',
    href: 'https://www.reuters.com/world/us/five-big-takeaways-trumps-midterm-convention-2026-09-11/',
    external: true,
  },
  {
    id: 'trump-dividend',
    kind: 'wire',
    section: 'politics',
    kicker: 'Politics',
    headline: 'Trump pledges $5,000 to every U.S. adult if Republicans keep Congress',
    dek: 'The Associated Press reports the president made the pledge at the Dallas convention without saying how it would be paid for.',
    dateLabel: 'Sept. 10, 2026',
    datetime: '2026-09-10',
    source: 'Associated Press',
    href: 'https://apnews.com/article/trump-dividend-5k-5000-check-republicans-cc80644e3168acd31c892129fb849436',
    external: true,
  },
  {
    id: 'dallas-strategy',
    kind: 'wire',
    section: 'politics',
    kicker: 'Politics',
    headline: 'Some Republicans question a Trump-centered midterm strategy',
    dek: 'After Dallas, Reuters found loyalists uneasy about asking voters to treat the midterms as if the president were on the ballot.',
    dateLabel: 'Sept. 11, 2026',
    datetime: '2026-09-11',
    source: 'Reuters',
    href: 'https://www.reuters.com/world/us/dallas-convention-some-loyalists-question-trump-centric-midterms-strategy-2026-09-11/',
    external: true,
  },
  {
    id: 'andrews-ireland',
    kind: 'wire',
    section: 'white-house',
    kicker: 'White House',
    headline: 'At Andrews, Trump calls Dallas a success and departs for Ireland',
    dek: 'Speaking to reporters before takeoff, the president said the midterm convention packed the hall and previewed meetings with European leaders.',
    dateLabel: 'Sept. 11, 2026',
    datetime: '2026-09-11',
    source: 'C-SPAN',
    href: 'https://www.c-span.org/program/white-house-event/president-trump-speaks-to-reporters/685117',
    external: true,
  },
  {
    id: 'fed-rates',
    kind: 'wire',
    section: 'markets',
    kicker: 'Markets',
    headline: 'White House presses the Fed ahead of a September rate decision',
    dek: 'CNBC reports the president and senior officials publicly urged the Federal Reserve not to raise rates after a stronger August jobs report.',
    dateLabel: 'Sept. 5, 2026',
    datetime: '2026-09-05',
    source: 'CNBC',
    href: 'https://www.cnbc.com/2026/09/05/trump-warsh-fed-september-rate-hike.html',
    external: true,
  },
  {
    id: 'crypto-meeting-reuters',
    kind: 'wire',
    section: 'markets',
    kicker: 'Markets',
    headline: 'Trump calls on Congress to pass a crypto market-structure bill',
    dek: 'At a White House meeting with executives including Robinhood’s Vlad Tenev, the president urged a “fair version of the Clarity Act.”',
    dateLabel: 'Aug. 19, 2026',
    datetime: '2026-08-19',
    source: 'Reuters',
    href: 'https://www.reuters.com/legal/government/trump-host-crypto-executives-sec-weighs-regulations-2026-08-19/',
    external: true,
  },
  {
    id: 'clarity-decrypt',
    kind: 'wire',
    section: 'white-house',
    kicker: 'White House',
    headline: 'Executives from Coinbase, Robinhood and Nasdaq join a White House session',
    dek: 'Decrypt’s account of the Aug. 19 gathering lists the industry and exchange chiefs who appeared with the president and his regulators.',
    dateLabel: 'Aug. 19, 2026',
    datetime: '2026-08-19',
    source: 'Decrypt',
    href: 'https://decrypt.co/376006/trump-pass-fair-version-clarity-white-house-crypto-meeting',
    external: true,
  },
  {
    id: 'trump-accounts-launch',
    kind: 'wire',
    section: 'white-house',
    kicker: 'White House',
    headline: 'Trump rings the opening bell for Trump Accounts from the Oval Office',
    dek: 'The White House said the July 6 ceremony marked the launch of tax-advantaged accounts for children, including a $1,000 federal seed for eligible births.',
    dateLabel: 'July 6, 2026',
    datetime: '2026-07-06',
    source: 'The White House',
    href: 'https://www.whitehouse.gov/releases/2026/07/president-trump-rings-in-trump-accounts-with-historic-opening-bell-ceremony-from-the-oval-office/',
    external: true,
    image: {
      src: '/trump-accounts-podium.png',
      alt: 'President Trump at a Trump Accounts event podium',
    },
  },
  {
    id: 'irs-accounts',
    kind: 'wire',
    section: 'markets',
    kicker: 'Markets',
    headline: 'IRS explains how families elect a Trump Account',
    dek: 'Parents and guardians use Form 4547 through an IRS online account. The pilot $1,000 contribution applies to children born from 2025 through 2028.',
    dateLabel: 'July 7, 2026',
    datetime: '2026-07-07',
    source: 'Internal Revenue Service',
    href: 'https://www.irs.gov/trumpaccounts',
    external: true,
  },
  {
    id: 'roll-call-accounts',
    kind: 'wire',
    section: 'markets',
    kicker: 'Markets',
    headline: 'A closer look at the promise — and limits — of Trump Accounts',
    dek: 'Roll Call examines how the child investment accounts work, the S&P 500 default, and what the $1,000 seed is likely to grow into without extra deposits.',
    dateLabel: 'July 24, 2026',
    datetime: '2026-07-24',
    source: 'Roll Call',
    href: 'https://rollcall.com/2026/07/24/the-dubious-rags-to-riches-promise-of-trump-accounts/',
    external: true,
  },
]

export function storiesForSection(section: SectionId): Story[] {
  return STORIES.filter((story) => story.section === section)
}

export function topStories(): Story[] {
  return STORIES.filter((story) => story.id !== FEATURE_STORY.id).slice(0, 6)
}

export function otherHomeStories(): Story[] {
  return STORIES.filter((story) => story.id !== FEATURE_STORY.id)
}

export function originalStories(): Story[] {
  return STORIES.filter((story) => story.kind === 'feature')
}
