export const PLATE = {
  phone: "/screens/phone.jpg",
  tape: "/screens/chart.jpg",
  notes: "/screens/notes.jpg",
  grok: "/cast/grok.jpg",
  tv: "/screens/tv.jpg",
  laptop: "/screens/feed.jpg",
} as const;

export type PlateKind = keyof typeof PLATE;
