export type Source = {
  label: string
  href: string
}

export type Beat = {
  n: string
  title: string
  note: string
  body: string
  image?: string
  alt?: string
  source: Source
}

export const TOKEN_NAME = 'Family Dog'
export const TICKER = '$DANNY'
export const X_HANDLE = '@PonsFamilyDog'
export const X_URL = 'https://x.com/PonsFamilyDog'
export const CA = '0xf4e1170058fa5219f52ee282abceb442e4087935'
export const TAGLINE = 'Good dogs build better ecosystems.'

export const TRAIL = ['ETH Milan', 'Ozzy / Roots', 'Pons', 'The post', 'Danny'] as const

export const CHECKS = ['ETH Milan', 'Roots', 'GitHub', 'The post', 'CA', 'Danny'] as const

export const BEATS: Beat[] = [
  {
    n: '01',
    title: 'ETH Milan 2024',
    note: 'first pin',
    body: 'Berachain panel. Ozzy takes the mic and says it out loud: “My name is Ozzy, I’m the founder at Roots.” The board gets its first pin.',
    image: '/eth-milan.png',
    alt: 'ETH Milan 2024 Berachain Ecosystem Panel',
    source: {
      label: 'Watch the panel',
      href: 'https://www.youtube.com/watch?v=9zV10Rte2sc&t=22s',
    },
  },
  {
    n: '02',
    title: 'Ozzy / Roots',
    note: 'same handle',
    body: 'That line locks Ozzy to Roots. Same Ozzy / @MEADGod the Pons corner already knew. The stage name sticks.',
    source: {
      label: '@rootsfi',
      href: 'https://x.com/rootsfi',
    },
  },
  {
    n: '03',
    title: 'Pons',
    note: 'same trail',
    body: 'Roots to Pons is one line. Founder of @ponsdotfamily is the Ozzy from the panel. The family name is already on the door.',
    source: {
      label: '@ponsdotfamily',
      href: 'https://x.com/ponsdotfamily',
    },
  },
  {
    n: '04',
    title: 'meetg0d',
    note: 'public handle',
    body: 'On GitHub he ships as meetg0d, display name Ozzy. Another public stamp on the same trail. Next pin.',
    source: {
      label: 'github.com/meetg0d',
      href: 'https://github.com/meetg0d',
    },
  },
  {
    n: '05',
    title: 'The old post',
    note: 'found him',
    body: 'Then an old public post. Same Ozzy. A white frenchie, black patch over the right eye, brown collar. The post names him Danny.',
    image: '/danny-post.jpg',
    alt: 'Danny on the court',
    source: {
      label: 'See the post',
      href: 'https://www.instagram.com/p/CDUTI1dnafL/',
    },
  },
]

export const SOURCES: Source[] = [
  { label: '@PonsFamilyDog', href: 'https://x.com/PonsFamilyDog' },
  { label: 'ETH Milan panel', href: 'https://www.youtube.com/watch?v=9zV10Rte2sc&t=22s' },
  { label: 'meetg0d', href: 'https://github.com/meetg0d' },
  { label: 'Pons', href: 'https://docs.ponsfamily.com/v2' },
  { label: 'Roots', href: 'https://x.com/rootsfi' },
  { label: 'Danny post', href: 'https://www.instagram.com/p/CDUTI1dnafL/' },
]
