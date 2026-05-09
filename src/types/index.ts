export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[] | null;
  video_url: string | null;
  privacy: 'public' | 'friends' | 'private';
  created_at: string;
  updated_at: string;
  profile?: Profile;
  reactions_count?: number;
  comments_count?: number;
  user_reaction?: string | null;
  hashtags?: string[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  replies?: Comment[];
  replies_count?: number;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply';
  post_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
  post?: Pick<Post, 'id' | 'content'>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  other_user?: Profile;
  unread_count?: number;
}

export interface Hashtag {
  id: string;
  name: string;
  posts_count: number;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};
