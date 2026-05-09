-- ============================================================
-- NEXORA - Social Media Platform Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text not null default '',
  bio text,
  avatar_url text,
  website text,
  last_seen timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 30),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null default '',
  image_urls text[],
  video_url text,
  privacy text default 'public' check (privacy in ('public', 'friends', 'private')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- HASHTAGS
-- ============================================================
create table if not exists public.hashtags (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  posts_count integer default 0,
  created_at timestamptz default now() not null
);

create table if not exists public.post_hashtags (
  post_id uuid references public.posts(id) on delete cascade,
  hashtag_id uuid references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- ============================================================
-- REACTIONS
-- ============================================================
create table if not exists public.reactions (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text default 'like' check (type in ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz default now() not null,
  unique (post_id, user_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('like', 'comment', 'follow', 'mention', 'reply')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- MESSAGES & CONVERSATIONS
-- ============================================================
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participants uuid[] not null,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  image_url text,
  read boolean default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- BLOCKS & REPORTS
-- ============================================================
create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);
-- Full-text search
create index if not exists profiles_username_trgm on public.profiles using gin(username gin_trgm_ops);
create index if not exists profiles_full_name_trgm on public.profiles using gin(full_name gin_trgm_ops);
create index if not exists posts_content_trgm on public.posts using gin(content gin_trgm_ops);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Posts policies
create policy "Public posts viewable by everyone" on public.posts for select using (privacy = 'public' or user_id = auth.uid());
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

-- Reactions policies
create policy "Reactions viewable by everyone" on public.reactions for select using (true);
create policy "Users can react to posts" on public.reactions for insert with check (auth.uid() = user_id);
create policy "Users can update their reaction" on public.reactions for update using (auth.uid() = user_id);
create policy "Users can delete their reaction" on public.reactions for delete using (auth.uid() = user_id);

-- Comments policies
create policy "Comments viewable by everyone" on public.comments for select using (true);
create policy "Users can comment" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update their comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete their comments" on public.comments for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Follows viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Notifications policies
create policy "Users can view their notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);
create policy "Users can update their notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Users can delete their notifications" on public.notifications for delete using (auth.uid() = user_id);

-- Conversations policies
create policy "Users can view their conversations" on public.conversations for select using (auth.uid() = any(participants));
create policy "Users can create conversations" on public.conversations for insert with check (auth.uid() = any(participants));
create policy "Users can update their conversations" on public.conversations for update using (auth.uid() = any(participants));

-- Messages policies
create policy "Users can view messages in their conversations" on public.messages for select
  using (exists (select 1 from public.conversations where id = conversation_id and auth.uid() = any(participants)));
create policy "Users can send messages" on public.messages for insert
  with check (auth.uid() = sender_id and exists (select 1 from public.conversations where id = conversation_id and auth.uid() = any(participants)));
create policy "Users can delete their messages" on public.messages for delete using (auth.uid() = sender_id);

-- Hashtags policies
create policy "Hashtags viewable by everyone" on public.hashtags for select using (true);
create policy "Authenticated users can create hashtags" on public.hashtags for insert with check (auth.uid() is not null);

-- Post hashtags policies
create policy "Post hashtags viewable by everyone" on public.post_hashtags for select using (true);
create policy "Users can add hashtags to their posts" on public.post_hashtags for insert
  with check (exists (select 1 from public.posts where id = post_id and user_id = auth.uid()));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_posts_updated_at before update on public.posts
  for each row execute procedure public.set_updated_at();
create trigger set_comments_updated_at before update on public.comments
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('messages', 'messages', false) on conflict do nothing;

-- Storage policies
create policy "Avatar images are publicly accessible" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update their own avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Post media is publicly accessible" on storage.objects for select using (bucket_id = 'posts');
create policy "Users can upload post media" on storage.objects for insert with check (bucket_id = 'posts' and auth.uid() is not null);

create policy "Message media viewable by participants" on storage.objects for select using (bucket_id = 'messages' and auth.uid() is not null);
create policy "Users can upload message media" on storage.objects for insert with check (bucket_id = 'messages' and auth.uid() is not null);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
-- Add tables to the realtime publication
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;


alter table public.profiles add column if not exists last_seen timestamptz default now();
