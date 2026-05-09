import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PostCard from '@/components/posts/PostCard';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from('posts').select('content').eq('id', id).single();
  return { title: post?.content?.slice(0, 60) || 'Bài viết', description: post?.content?.slice(0, 160) };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from('posts')
    .select('*, profile:profiles(*), reactions:reactions(count), comments:comments(count)')
    .eq('id', id)
    .single();

  if (!post) notFound();

  const currentProfile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null;

  const enrichedPost = {
    ...post,
    reactions_count: post.reactions?.[0]?.count ?? 0,
    comments_count: post.comments?.[0]?.count ?? 0,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6) var(--space-4)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <PostCard post={enrichedPost} currentProfile={currentProfile} />
      </div>
    </div>
  );
}
