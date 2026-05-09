import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Xem trang cá nhân của ${username} trên Nexora`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const { data: currentProfile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null };

  // Follower counts
  const [{ count: followersCount }, { count: followingCount }, { count: postsCount }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
  ]);

  const isFollowing = currentProfile
    ? !!(await supabase.from('follows').select('follower_id').eq('follower_id', currentProfile.id).eq('following_id', profile.id).single()).data
    : false;

  return (
    <ProfileClient
      profile={{ ...profile, followers_count: followersCount ?? 0, following_count: followingCount ?? 0, posts_count: postsCount ?? 0, is_following: isFollowing }}
      currentProfile={currentProfile}
    />
  );
}
