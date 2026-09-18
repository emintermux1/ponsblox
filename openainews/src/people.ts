export type Person = {
  id: string
  name: string
  role: string
  bio: string
  photo: string
  alt: string
  credit: string
  href?: string
}

export const PEOPLE: Person[] = [
  {
    id: 'sam-altman',
    name: 'Sam Altman',
    role: 'Co-founder & CEO',
    bio: 'Altman remains CEO and sits on the OpenAI Foundation board.',
    photo: '/people/sam-altman.jpg',
    alt: 'Sam Altman, co-founder and CEO of OpenAI',
    credit: 'Cabinet Public Affairs Office, Japan / Wikimedia Commons, 2025',
  },
  {
    id: 'jakub-pachocki',
    name: 'Jakub Pachocki',
    role: 'Chief Scientist',
    bio: 'Recently published An Alien Mind.',
    photo: '/people/jakub-pachocki.jpg',
    alt: 'Jakub Pachocki, chief scientist at OpenAI',
    credit: 'Wikimedia Commons',
    href: 'https://openai.com/index/an-alien-mind/',
  },
  {
    id: 'mark-chen',
    name: 'Mark Chen',
    role: 'Chief Research Officer',
    bio: 'Drives scientific progress and the path from research into products.',
    photo: '/people/mark-chen.jpg',
    alt: 'Mark Chen, chief research officer at OpenAI',
    credit: 'OpenAI',
    href: 'https://openai.com/index/leadership-updates-march-2025/',
  },
  {
    id: 'greg-brockman',
    name: 'Greg Brockman',
    role: 'President & Co-founder',
    bio: 'OpenAI’s president and co-founder.',
    photo: '/people/greg-brockman.jpg',
    alt: 'Greg Brockman, president and co-founder of OpenAI',
    credit: 'TechCrunch / Wikimedia Commons',
  },
]
