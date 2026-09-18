import type { ArticleId, SectionId } from './routes.ts'

export type IndexBarRow = { label: string; value: number }
export type BoardRow = { label: string; value: string; change: string }

export type ArticleBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'pull'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'cite'; before: string; label: string; href: string; after?: string }
  | {
      kind: 'figure'
      src: string
      alt: string
      caption: string
      credit?: string
      crop?: 'wide' | 'tight'
    }
  | { kind: 'know'; heading: string; items: string[] }
  | {
      kind: 'bars'
      kicker: string
      heading: string
      caption: string
      credit?: string
      baseline: number
      rows: IndexBarRow[]
    }
  | {
      kind: 'spark'
      kicker: string
      heading: string
      value: string
      change: string
      fromBaseline: string
      points: number[]
      labels: string[]
      caption: string
      credit?: string
    }
  | {
      kind: 'board'
      kicker: string
      heading: string
      caption: string
      credit?: string
      rows: BoardRow[]
    }

export type FeatureArticle = {
  id: ArticleId
  section: SectionId
  kicker: string
  headline: string
  dek: string
  byline: string
  role: string
  dateLabel: string
  location: string
  datetime: string
  authorPhoto: string
  authorName: string
  authorBio: string
  hero: Extract<ArticleBlock, { kind: 'figure' }>
  body: ArticleBlock[]
  sources: { label: string; href: string }[]
}

const REUTERS =
  'https://www.reuters.com/legal/government/trump-host-crypto-executives-sec-weighs-regulations-2026-08-19/'
const FACTBASE =
  'https://rollcall.com/factbase/trump/transcript/donald-trump-remarks-technology-leaders-white-house-august-19-2026/'
const WHITE_HOUSE_ACCOUNTS =
  'https://www.whitehouse.gov/releases/2026/07/president-trump-rings-in-trump-accounts-with-historic-opening-bell-ceremony-from-the-oval-office/'
const TRUMP_ACCOUNTS_GOV = 'https://trumpaccounts.gov/'

export const FEATURE: FeatureArticle = {
  id: 'inside-the-white-house-crypto-meeting',
  section: 'markets',
  kicker: 'Markets',
  headline: 'Trump, Tenev and the Market That Never Really Closes',
  dek: 'Robinhood’s CEO came to the White House talking about ownership. The conversation quickly widened to Trump Accounts, round-the-clock trading and what a new generation expects from financial markets.',
  byline: 'By Alex Mercer',
  role: 'Markets Correspondent',
  dateLabel: 'August 19, 2026',
  location: 'Washington, D.C.',
  datetime: '2026-08-19',
  authorPhoto: '/alex-mercer.jpg',
  authorName: 'Alex Mercer',
  authorBio:
    'Alex Mercer is the markets correspondent for DJT News, covering capital markets, retail investing and the White House economic agenda. He is based in Washington.',
  hero: {
    kind: 'figure',
    src: '/hero-meeting.png',
    alt: 'President Donald Trump speaking with Vlad Tenev at a White House podium',
    caption:
      'President Donald Trump speaks with Robinhood chief executive Vlad Tenev inside the White House on Aug. 19, 2026, during a gathering of finance and digital-asset executives.',
    credit: 'DJT News',
    crop: 'wide',
  },
  body: [
    {
      kind: 'p',
      text: 'President Donald Trump had assembled an unusual cross-section of American finance in the White House on Wednesday.',
    },
    {
      kind: 'p',
      text: 'There were executives from Coinbase, Robinhood, Nasdaq, Intercontinental Exchange, Kraken and several of the largest companies operating at the intersection of traditional markets and crypto.',
    },
    {
      kind: 'p',
      text: 'The stated subject was serious: how the United States should regulate a financial system that is starting to look very different from the one Washington built its rules around.',
    },
    {
      kind: 'cite',
      before:
        'Trump urged lawmakers to advance crypto market-structure legislation and repeatedly returned to the idea that the United States should remain ahead as finance moves toward blockchain infrastructure and digital assets. (',
      label: 'Reuters',
      href: REUTERS,
      after: ')',
    },
    {
      kind: 'p',
      text: 'When Robinhood CEO Vlad Tenev took his turn, however, he started somewhere more familiar.',
    },
    { kind: 'quote', text: 'Ownership.' },
    {
      kind: 'p',
      text: 'That, Tenev said publicly, was the word he would use to describe Robinhood.',
    },
    {
      kind: 'p',
      text: 'He thanked Trump for efforts intended to give younger Americans a stake in the economy, specifically mentioning Trump Accounts, before drawing a line from Robinhood’s commission-free trading to 24-hour markets and tokenization.',
    },
    {
      kind: 'p',
      text: 'The products have changed. The argument behind them has not.',
    },
    { kind: 'p', text: 'More people should own things.' },
    {
      kind: 'figure',
      src: '/tenev-remarks.png',
      alt: 'Vlad Tenev speaking in front of an American flag',
      caption:
        'Vlad Tenev delivering remarks. In the White House session he thanked the president for Trump Accounts, then summarized Robinhood as a company built around ownership.',
      credit: 'DJT News',
    },
    { kind: 'h2', text: 'From Trump Accounts to a market on your phone' },
    {
      kind: 'p',
      text: 'Trump Accounts provided an obvious point of overlap between the two men.',
    },
    {
      kind: 'p',
      text: 'For Trump, they fit into a broader political argument about giving Americans an economic stake early in life. For Tenev, the concept sits comfortably beside Robinhood’s long-running pitch that investing should reach a much larger portion of the population.',
    },
    {
      kind: 'p',
      text: 'Tenev told the room that tokenization could eventually extend that access beyond public equities and into assets that ordinary investors have historically struggled to reach.',
    },
    { kind: 'p', text: 'Then there is the question of time.' },
    {
      kind: 'p',
      text: 'Robinhood has spent years making the traditional trading day feel less traditional. Crypto took the idea further by creating a market where checking a price at midnight on Sunday feels completely normal.',
    },
    {
      kind: 'p',
      text: 'For younger traders, a closed market can increasingly feel like the strange part.',
    },
    {
      kind: 'figure',
      src: '/hero-meeting.png',
      alt: 'A tighter crop of Trump and Tenev at the White House podium',
      caption:
        'Trump and Tenev at the White House podium after the formal remarks. The public program covered market-structure legislation; afterward the conversation turned to Trump Accounts and a market that never closes.',
      credit: 'DJT News',
      crop: 'tight',
    },
    {
      kind: 'note',
      text: 'Fictionalized dialogue inspired by the topics discussed at the meeting.',
    },
    {
      kind: 'p',
      text: 'Trump asked Tenev what happens when a generation grows up with Trump Accounts and starts investing from an early age.',
    },
    {
      kind: 'p',
      text: '“They won’t think about markets the way previous generations did,” Tenev said. “They’ll expect ownership from day one, 24-hour access and eventually far more assets onchain.”',
    },
    { kind: 'p', text: '“So the market never really closes?”' },
    { kind: 'p', text: '“That’s where it’s heading.”' },
    { kind: 'p', text: '“And everyone can own something?”' },
    { kind: 'p', text: '“That’s the goal.”' },
    { kind: 'p', text: 'Trump said that sounded like a much better system.' },
    {
      kind: 'p',
      text: '“More ownership, more trading, more American companies. There’s only one problem.”',
    },
    { kind: 'p', text: '“What’s that?”' },
    { kind: 'p', text: '“It has to keep going up.”' },
    { kind: 'p', text: 'Vlad Tenev laughed and said:' },
    { kind: 'p', text: '“Traders already have a name for that.”' },
    { kind: 'p', text: '“What do they call it?”' },
    { kind: 'p', text: '“Up only.”' },
    { kind: 'p', text: 'Trump repeated it.' },
    { kind: 'p', text: '“Up only. Now that’s a market I understand.”' },
    { kind: 'p', text: 'Tenev replied:' },
    { kind: 'p', text: '“Pretty much the market everyone wants.”' },
    {
      kind: 'p',
      text: 'The conversation then moved back to tokenized equities, private companies and how American markets could reach a much larger group of investors.',
    },
    {
      kind: 'figure',
      src: '/markets-session.jpg',
      alt: 'An illustration of a rising market session on a generic chart',
      caption:
        'An illustration of a rising session on a retail brokerage screen. This is an original graphic, not an official Robinhood screenshot.',
      credit: 'DJT News',
    },
    {
      kind: 'p',
      text: 'The joke landed because it captured something real about the audience Robinhood helped create.',
    },
    {
      kind: 'p',
      text: 'Wall Street can describe rising asset prices through earnings growth, expanding multiples, liquidity conditions or capital appreciation.',
    },
    { kind: 'p', text: 'The internet usually requires fewer words.' },
    {
      kind: 'p',
      text: '“Up only” is not an investment strategy. It is trader shorthand for the impossible market everyone would choose if given the option.',
    },
    {
      kind: 'p',
      text: 'It is also why the push toward broader ownership creates an interesting tension.',
    },
    {
      kind: 'p',
      text: 'Giving millions more people access to financial markets is relatively easy to understand when prices are rising. The harder questions appear when they are not.',
    },
    {
      kind: 'cite',
      before:
        'Tenev acknowledged part of that tension, saying innovation and investor protection should not be treated as opposing goals. America became the center of global capital markets by pursuing both, he argued. (',
      label: 'Roll Call / Factbase',
      href: FACTBASE,
      after: ')',
    },
    { kind: 'h2', text: 'What comes after access?' },
    {
      kind: 'p',
      text: 'That may ultimately be the more consequential question raised by Wednesday’s gathering.',
    },
    { kind: 'p', text: 'Commission-free trading removed one barrier.' },
    { kind: 'p', text: 'Mobile apps removed another.' },
    {
      kind: 'p',
      text: 'Twenty-four-hour trading is reducing the importance of the clock.',
    },
    {
      kind: 'p',
      text: 'Tokenization could begin removing boundaries between entirely different categories of assets.',
    },
    {
      kind: 'p',
      text: 'The result is a financial system in which ownership becomes easier, markets become harder to close and the distinction between traditional finance and crypto becomes less obvious to the person holding the phone.',
    },
    {
      kind: 'p',
      text: 'Trump’s focus was on keeping that system centered in the United States.',
    },
    { kind: 'p', text: 'Tenev’s was on getting more Americans into it.' },
    {
      kind: 'p',
      text: 'For regulators, the challenge will be working out what happens when those two ambitions meet.',
    },
    {
      kind: 'p',
      text: 'The technology is moving quickly. Washington, as usual, has considerably more to debate.',
    },
    {
      kind: 'figure',
      src: '/trump-accounts-podium.png',
      alt: 'President Trump at a Trump Accounts event, speaking at a podium',
      caption:
        'President Trump at a Trump Accounts event. The program was a point of overlap in Tenev’s Aug. 19 remarks. This photograph is from a related public appearance, not a wide shot of the Roosevelt Room.',
      credit: 'DJT News',
      crop: 'wide',
    },
    {
      kind: 'p',
      text: 'President Trump hosted executives and regulators on August 19 as Washington continued debating the rules governing the next generation of American markets.',
    },
  ],
  sources: [
    { label: 'Reuters, Aug. 19, 2026', href: REUTERS },
    { label: 'Roll Call / Factbase transcript, Aug. 19, 2026', href: FACTBASE },
    { label: 'White House, Trump Accounts launch, July 6, 2026', href: WHITE_HOUSE_ACCOUNTS },
    { label: 'TrumpAccounts.gov', href: TRUMP_ACCOUNTS_GOV },
  ],
}

export const GAINS: FeatureArticle = {
  id: 'trump-unveils-gains-index',
  section: 'markets',
  kicker: 'Markets',
  headline: 'Trump announces new “Department of Gains” focused on U.S. markets and economic growth',
  dek: 'White House unveils new economic initiative and “Gains Index” tracking U.S. stocks, technology, memecoins and digital assets.',
  byline: 'By Alex Mercer',
  role: 'Markets Correspondent',
  dateLabel: 'September 17, 2026',
  location: 'Washington, D.C.',
  datetime: '2026-09-17',
  authorPhoto: '/alex-mercer.jpg',
  authorName: 'Alex Mercer',
  authorBio:
    'Alex Mercer is the markets correspondent for DJT News, covering capital markets, retail investing and the White House economic agenda. He is based in Washington.',
  hero: {
    kind: 'figure',
    src: '',
    alt: 'Editorial graphic of the Gains Index, showing a rising line and sector readouts for technology, equities, energy, manufacturing and digital assets',
    caption:
      'An original DJT News graphic illustrating the Gains Index as presented in Thursday’s White House announcement. Figures are illustrative.',
    credit: 'DJT News',
    crop: 'wide',
  },
  body: [
    {
      kind: 'p',
      text: 'WASHINGTON, Sept. 17 — U.S. President Donald Trump on Thursday announced the creation of a new initiative called the Department of Gains, unveiling a broad effort focused on accelerating domestic investment and strengthening U.S. financial markets.',
    },
    {
      kind: 'p',
      text: 'The announcement came as Trump delivered remarks on the economy, with the administration presenting the new department as a central hub for tracking growth across major American industries and assets.',
    },
    {
      kind: 'p',
      text: 'At the center of the initiative is a new benchmark called the Gains Index, which will track performance across U.S. equities, technology, manufacturing, energy and digital assets.',
    },
    { kind: 'pull', text: 'America should be the country of gains.' },
    {
      kind: 'p',
      text: 'The administration said additional details surrounding the department are expected to be released following Thursday’s announcement.',
    },
    {
      kind: 'know',
      heading: 'What we know',
      items: [
        'Department of Gains announced Thursday',
        'New “Gains Index” will track major areas of the U.S. economy',
        'Technology, equities, manufacturing, energy and digital assets included',
        'Public live dashboard planned',
        'Additional details expected',
      ],
    },
    {
      kind: 'p',
      text: 'The Gains Index is intended to provide a single headline measure of economic and market momentum, combining several sectors normally tracked independently.',
    },
    {
      kind: 'p',
      text: 'A public-facing dashboard is also planned, allowing Americans to monitor the index and its underlying components in real time.',
    },
    {
      kind: 'bars',
      kicker: 'Graphic',
      heading: 'Gains Index — initial baseline: 100',
      caption: 'Initial illustrative composition of the Gains Index.',
      credit: 'DJT News',
      baseline: 100,
      rows: [
        { label: 'Technology', value: 128 },
        { label: 'U.S. Equities', value: 121 },
        { label: 'Energy', value: 116 },
        { label: 'Manufacturing', value: 112 },
        { label: 'Digital Assets', value: 109 },
      ],
    },
    {
      kind: 'p',
      text: 'The administration said the dashboard would eventually display individual sector performance, historical movements, daily changes and the industries contributing most heavily to the headline index.',
    },
    { kind: 'h2', text: 'Markets in focus following announcement' },
    {
      kind: 'p',
      text: 'The initiative places financial markets unusually close to the center of the administration’s economic messaging.',
    },
    {
      kind: 'p',
      text: 'The Department of Gains will focus on attracting capital into American companies, encouraging domestic investment and tracking expansion across strategic U.S. industries.',
    },
    {
      kind: 'p',
      text: 'Technology and manufacturing are expected to feature prominently alongside U.S. public markets and energy.',
    },
    {
      kind: 'p',
      text: 'Digital assets will also be represented in the benchmark.',
    },
    {
      kind: 'spark',
      kicker: 'Markets',
      heading: 'Gains Index — live preview',
      value: '124.18',
      change: '2.41%',
      fromBaseline: '24.18% from initial baseline',
      points: [100, 104, 111, 108, 117, 124],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Sep'],
      caption: 'Illustrative Gains Index data.',
      credit: 'DJT News',
    },
    {
      kind: 'p',
      text: 'Details on the methodology and weighting of individual sectors were not immediately released.',
    },
    {
      kind: 'p',
      text: 'The administration is expected to provide further information as the initiative is rolled out.',
    },
    { kind: 'h2', text: '“More gains. More winning.”' },
    {
      kind: 'p',
      text: 'The announcement is being introduced under a simple message: MORE GAINS. MORE WINNING.',
    },
    {
      kind: 'p',
      text: 'A dedicated Department of Gains website is expected to host the public dashboard, with a headline Gains Index displayed alongside its major components.',
    },
    {
      kind: 'board',
      kicker: 'Graphic',
      heading: 'U.S. Gains Dashboard',
      caption: 'Illustrative dashboard figures.',
      credit: 'DJT News',
      rows: [
        { label: 'Gains Index', value: '124.18', change: '2.41%' },
        { label: 'Technology', value: '128.40', change: '3.12%' },
        { label: 'U.S. Equities', value: '121.72', change: '1.84%' },
        { label: 'Manufacturing', value: '112.31', change: '0.92%' },
        { label: 'Energy', value: '116.08', change: '1.37%' },
        { label: 'Digital Assets', value: '109.64', change: '4.26%' },
      ],
    },
    {
      kind: 'p',
      text: 'The announcement marks the first public disclosure of the initiative. Further details are expected.',
    },
  ],
  sources: [],
}

export function getArticle(id: ArticleId): FeatureArticle {
  switch (id) {
    case 'inside-the-white-house-crypto-meeting':
      return FEATURE
    case 'trump-unveils-gains-index':
      return GAINS
    default: {
      const _never: never = id
      return _never
    }
  }
}
