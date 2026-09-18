export type RedditSourceKind = 'subreddit' | 'post' | 'manual'

export type RedditSource = {
  kind: RedditSourceKind
  label: string
  subreddit: string
  url: string
  hint: string
}

const SUB_RE = /(?:https?:\/\/)?(?:www\.|old\.|np\.)?reddit\.com\/r\/([A-Za-z0-9_]+)/i
const POST_RE = /(?:https?:\/\/)?(?:www\.|old\.)?reddit\.com\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)/i
const COMMENTS_RE = /(?:https?:\/\/)?(?:www\.|old\.|np\.)?reddit\.com\/comments\/([A-Za-z0-9]+)/i
const SHORT_RE = /(?:https?:\/\/)?(?:www\.)?redd\.it\/([A-Za-z0-9]+)/i
const HANDLE_RE = /^r\/([A-Za-z0-9_]+)$/i

export function parseRedditSource(raw: string): RedditSource | null {
  const text = raw.trim()
  if (!text) return null
  const post = text.match(POST_RE)
  if (post?.[1] && post[2]) {
    const sub = post[1]
    return {
      kind: 'post',
      label: `Post in r/${sub}`,
      subreddit: `r/${sub}`,
      url: `https://www.reddit.com/r/${sub}/comments/${post[2]}/`,
      hint: 'A single thread, tokenized as a market.',
    }
  }
  const comments = text.match(COMMENTS_RE)
  if (comments?.[1]) {
    return {
      kind: 'post',
      label: 'Reddit post',
      subreddit: 'r/reddit.com',
      url: `https://www.reddit.com/comments/${comments[1]}/`,
      hint: 'A comments URL. Add the subreddit name if you know it.',
    }
  }
  const short = text.match(SHORT_RE)
  if (short?.[1]) {
    return {
      kind: 'post',
      label: 'Reddit post',
      subreddit: 'r/reddit.com',
      url: `https://redd.it/${short[1]}`,
      hint: 'A shortened post link. Add the subreddit name if you know it.',
    }
  }
  const sub = text.match(SUB_RE) || text.match(HANDLE_RE)
  if (sub?.[1]) {
    return {
      kind: 'subreddit',
      label: `r/${sub[1]}`,
      subreddit: `r/${sub[1]}`,
      url: `https://www.reddit.com/r/${sub[1]}/`,
      hint: 'The whole community becomes the pair.',
    }
  }
  if (text.length >= 2 && text.length <= 48) {
    const slug = text.replace(/^r\//i, '').replace(/[^A-Za-z0-9_]/g, '')
    if (!slug) return null
    return {
      kind: 'manual',
      label: `r/${slug}`,
      subreddit: `r/${slug}`,
      url: `https://www.reddit.com/r/${slug}/`,
      hint: 'Manual community or meme entry.',
    }
  }
  return null
}

export function kindLabel(kind: RedditSourceKind): string {
  switch (kind) {
    case 'subreddit':
      return 'Subreddit'
    case 'post':
      return 'Post'
    case 'manual':
      return 'Manual'
    default: {
      const _e: never = kind
      return _e
    }
  }
}
