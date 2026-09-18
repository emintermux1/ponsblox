export type MuseRow = {
  handle: string;
  display_name: string;
  age: number;
  bio: string;
  price_cents: number;
  tags: string;
  likes: number;
  avatar_path: string;
  banner_path: string;
  hero_glb_path: string | null;
};

export type PostRow = {
  id: string;
  muse_handle: string;
  caption: string;
  image_path: string;
  visibility: "free" | "locked" | "ppv";
  price_cents: number;
  created_at: number;
};

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
};

export type SessionRow = {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
};

export type MessageRow = {
  id: string;
  user_id: string;
  muse_handle: string;
  body: string;
  image_path: string | null;
  visibility: "free" | "ppv";
  price_cents: number;
  from_muse: number;
  created_at: number;
};

export type SubscriptionRow = {
  user_id: string;
  muse_handle: string;
  created_at: number;
};

export type TipRow = {
  id: string;
  user_id: string;
  muse_handle: string;
  amount_cents: number;
  created_at: number;
};

export type UnlockRow = {
  user_id: string;
  message_id: string;
  created_at: number;
};

export type MusePostView = PostRow & { open: boolean };
export type ThreadPreview = {
  handle: string;
  display_name: string;
  avatar_path: string;
  last_at: number;
};
export type AccountSub = {
  handle: string;
  display_name: string;
  avatar_path: string;
  price_cents: number;
  created_at: number;
};
export type AccountTip = {
  id: string;
  amount_cents: number;
  created_at: number;
  display_name: string;
};
export type ThreadMessage = MessageRow & { open: boolean };

export type FanState = {
  users: UserRow[];
  sessions: SessionRow[];
  subscriptions: SubscriptionRow[];
  tips: TipRow[];
  messages: MessageRow[];
  unlocks: UnlockRow[];
};
