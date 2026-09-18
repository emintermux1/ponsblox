export const PRODUCT = 'Trump AI'
export const MODEL = 'T-1'
export const VENUE = 'DJT'
export const PARTNER = 'OpenAI'
export const SUBJECT = 'Donald J. Trump'
export const PORTRAIT = '/portrait.jpg'
export const PORTRAIT_FALLBACK =
  'https://upload.wikimedia.org/wikipedia/commons/1/16/Official_Presidential_Portrait_of_President_Donald_J._Trump_%282025%29.jpg'
export const INTRO = 'Introducing'
export const CLAIM_HEAD = 'T-1'
export const CLAIM =
  'Trump AI. Trump’s brain. Newly developed in DJT, with OpenAI. The next model — and the cheapest.'
export const POST_DATE = 'September 11, 2026'
export const POST_BYLINE = 'Trump AI Research'
export const HOME_URL = 'https://trumpai.news/'
export const POST_URL = 'https://trumpai.news/T1'
export const EAGLE = 'EAGLE-47 “Tacky”: NVIDIA’s New politic Model'
export const EAGLE_LINE = 'NVIDIA Eagle meets America’s 47th president'
export const EAGLE_DEK = 'NVIDIA Eagle meets America’s 47th president. Trump AI × NVIDIA.'
export const EAGLE_DATE = 'September 15, 2026'
export const EAGLE_AUTHOR = 'Cole Hart'
export const EAGLE_PARTNER = 'NVIDIA'
export const EAGLE_URL = 'https://trumpai.news/projects/eagle-47'
export const EAGLE_OG = 'https://trumpai.news/eagle-47-card.jpg'
export const EAGLE_HERO = '/eagle-47-hero.png'
export const EAGLE_REPO = 'https://github.com/NVlabs/Eagle'
export const EAGLE_SITE = 'https://nvlabs.github.io/Eagle/'
export const EAGLE_2_PAPER = 'https://arxiv.org/abs/2501.14818'
export const EAGLE_25_PAPER = 'https://arxiv.org/abs/2504.15271'

export const BIN_MS = 40
export const TUNING_BINS = 12

export type Desk = 'trade' | 'personnel' | 'media' | 'city' | 'energy' | 'foreign' | 'open'

export type Phase = 'listen' | 'retrieve' | 'decide' | 'speak' | 'hold'

export type Lobe = 'speech' | 'decision' | 'attention' | 'memory' | 'briefing'

export type Answer = {
  desk: Desk
  headline: string
  position: string
  move: string
  close: string
}

export type IncomingBrief = {
  id: string
  desk: Desk
  title: string
  line: string
}

export const INCOMING: IncomingBrief[] = [
  {
    id: 'steel',
    desk: 'trade',
    title: 'Reciprocal steel',
    line: 'Steel and autos. Ninety-day reciprocal window. Allies want exceptions.',
  },
  {
    id: 'chair',
    desk: 'personnel',
    title: 'Chair shortlist',
    line: 'Three names for the chair. Markets will read the first sentence.',
  },
  {
    id: 'noon',
    desk: 'media',
    title: 'Noon language',
    line: 'Press wants a line on the border cities before the afternoon shows.',
  },
  {
    id: 'gulf',
    desk: 'energy',
    title: 'Gulf desk',
    line: 'Energy ministers at 16:00. They want a number, not a speech.',
  },
  {
    id: 'midwest',
    desk: 'city',
    title: 'Plant city',
    line: 'A Midwest plant city wants a visit and a hiring number they can put on a fence.',
  },
  {
    id: 'strait',
    desk: 'foreign',
    title: 'Strait traffic',
    line: 'Insurance on the strait jumped overnight. Carriers are asking who pays.',
  },
]

export const SYSTEMS: { lobe: Lobe; title: string; body: string }[] = [
  {
    lobe: 'decision',
    title: 'Decision',
    body: 'How a choice is framed, ranked, and locked. The model does not wander. It picks a side and writes the next move.',
  },
  {
    lobe: 'speech',
    title: 'Rhetoric',
    body: 'Cadence, emphasis, close. The same position said so it lands — short, ranked, and hard to walk back.',
  },
  {
    lobe: 'memory',
    title: 'Memory',
    body: 'Prior positions, names, scores, who blinked. Retrieval is not search. It is the file he would already have open.',
  },
  {
    lobe: 'briefing',
    title: 'Briefing',
    body: 'Intake, rank, return. A desk item comes in. The model listens, pulls memory, decides, and speaks it back.',
  },
]

export function deskLabel(desk: Desk) {
  switch (desk) {
    case 'trade':
      return 'Trade'
    case 'personnel':
      return 'Personnel'
    case 'media':
      return 'Media'
    case 'city':
      return 'City'
    case 'energy':
      return 'Energy'
    case 'foreign':
      return 'Foreign'
    case 'open':
      return 'Open'
    default: {
      const _never: never = desk
      return _never
    }
  }
}

export function phaseLabel(phase: Phase) {
  switch (phase) {
    case 'listen':
      return 'Listening'
    case 'retrieve':
      return 'Memory'
    case 'decide':
      return 'Decision'
    case 'speak':
      return 'Speaking'
    case 'hold':
      return 'On desk'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

export function lobeLabel(lobe: Lobe) {
  switch (lobe) {
    case 'speech':
      return 'Rhetoric'
    case 'decision':
      return 'Decision'
    case 'attention':
      return 'Attention'
    case 'memory':
      return 'Memory'
    case 'briefing':
      return 'Briefing'
    default: {
      const _never: never = lobe
      return _never
    }
  }
}

export function classifyBrief(text: string): Desk {
  const q = text.toLowerCase()
  if (/tariff|trade|steel|auto|china|reciprocal|import|export|deal|factory/.test(q)) return 'trade'
  if (/chair|hire|fire|staff|cabinet|attorney|secretary|personnel|name|shortlist/.test(q)) return 'personnel'
  if (/press|media|message|speech|interview|camera|headline|noon/.test(q)) return 'media'
  if (/city|mayor|plant|midwest|fence|visit|crowd/.test(q)) return 'city'
  if (/energy|oil|gas|gulf|pipeline|grid|power|opec/.test(q)) return 'energy'
  if (/strait|nato|israel|ukraine|china|iran|border|allies|carrier|foreign/.test(q)) return 'foreign'
  return 'open'
}

function pack(desk: Desk, headline: string, position: string, move: string, close: string): Answer {
  return { desk, headline, position, move, close }
}

export function answerBrief(text: string): Answer {
  const desk = classifyBrief(text)
  switch (desk) {
    case 'trade':
      return pack(
        desk,
        'Make it here or pay to bring it in.',
        'The deal is simple. If they want our market, they build here or they pay at the dock. Friends who stopped acting like friends do not get a quieter rate.',
        'Ninety days. Reciprocal. Publish the schedule. Exceptions go on a short list with a date, not a feeling.',
        'Write it that way. Then hold the line.',
      )
    case 'personnel':
      return pack(
        desk,
        'Pick the person who will do it.',
        'I do not want a résumé that photographs well. I want someone who already ran a room and did not lose it.',
        'Three names. One recommendation. If the first sentence needs a lawyer, it is the wrong name.',
        'Put the choice on my desk before the markets invent one.',
      )
    case 'media':
      return pack(
        desk,
        'Say it once. Say it clean.',
        'They will take the first sentence and throw away the rest. So the first sentence is the policy.',
        'One line for noon. No stack of caveats. If they want detail, they wait for the written brief.',
        'Do not let the show write the language. We write it.',
      )
    case 'city':
      return pack(
        desk,
        'A number they can put on a fence.',
        'People in a plant city do not want a theory. They want jobs they can point at and a date they can believe.',
        'Give them a hiring number, a plant, and a visit. Keep the speech short enough to fit on a gate.',
        'If we cannot name the plant, we are not ready to go.',
      )
    case 'energy':
      return pack(
        desk,
        'A number, not a speech.',
        'Energy is production. If we are talking and they are pumping, we already lost the hour.',
        'Ask for volume and a price band. The meeting ends with a figure or it did not happen.',
        'We produce. That is the policy. Everything else is decoration.',
      )
    case 'foreign':
      return pack(
        desk,
        'Strength first. Then the call.',
        'Nobody calls because they like the weather. They call because the alternative is expensive.',
        'Quiet the strait. Name who pays the insurance. Allies get clarity. Adversaries get a cost.',
        'We do not rent our position. We set it.',
      )
    case 'open': {
      const clip = text.trim().replace(/\s+/g, ' ').slice(0, 72)
      return pack(
        desk,
        clip || 'Put it on the desk.',
        'I have the brief. The question is not whether we have a view. The question is whether we say it now or after we have the leverage.',
        'Rank it. One page. What we want, what we give, what we will not discuss.',
        'Bring it back when it is a decision, not a conversation.',
      )
    }
    default: {
      const _never: never = desk
      return _never
    }
  }
}
