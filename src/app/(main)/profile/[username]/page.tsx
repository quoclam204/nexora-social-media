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

  // Fetch followers and following arrays to calculate intersection (friends)
  const [{ data: followersData }, { data: followingData }, { count: postsCount }] = await Promise.all([
    supabase.from('follows').select('follower_id').eq('following_id', profile.id),
    supabase.from('follows').select('following_id').eq('follower_id', profile.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
  ]);

  const followerIds = new Set((followersData || []).map(f => f.follower_id));
  const followingIds = new Set((followingData || []).map(f => f.following_id));
  
  const followersCount = followerIds.size;
  const followingCount = followingIds.size;
  const friendsCount = [...followingIds].filter(id => followerIds.has(id)).length;

  const isFollowing = currentProfile ? followingIds.has(currentProfile.id) : false;
  const isFollowedBy = currentProfile ? followerIds.has(currentProfile.id) : false;

  return (
    <ProfileClient
      profile={{ 
        ...profile, 
        followers_count: followersCount, 
        following_count: followingCount, 
        posts_count: postsCount ?? 0, 
        is_following: isFollowing,
        is_followed_by: isFollowedBy,
        friends_count: friendsCount
      }}
      currentProfile={currentProfile}
    />
  );
}
