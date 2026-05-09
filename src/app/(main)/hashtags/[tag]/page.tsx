import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PostCard from '@/components/posts/PostCard';
import styles from './hashtag.module.css';

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${tag}`, description: `Bài viết với hashtag #${tag} trên Nexora` };
}

export default async function HashtagPage({ params }: Props) {
  const { tag } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const currentProfile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null;

  // Get hashtag
  const { data: hashtag } = await supabase.from('hashtags').select('*').eq('name', tag).single();

  // Get posts with this hashtag
  const { data: postHashtags } = await supabase
    .from('post_hashtags')
    .select('post_id')
    .eq('hashtag_id', hashtag?.id ?? '');

  const postIds = postHashtags?.map(ph => ph.post_id) ?? [];

  const posts = postIds.length > 0
    ? (await supabase.from('posts')
        .select('*, profile:profiles(*), reactions:reactions(count), comments:comments(count)')
        .in('id', postIds)
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
      ).data?.map((p: any) => ({
        ...p,
        reactions_count: p.reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
      })) ?? []
    : [];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.tagIcon}>#</div>
          <div>
            <h1 className={styles.tagName}>#{tag}</h1>
            <p className={styles.tagCount}>{hashtag?.posts_count ?? 0} bài viết</p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 56 }}>🏷️</div>
            <p style={{ marginTop: 'var(--space-3)' }}>Chưa có bài viết với hashtag này</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} currentProfile={currentProfile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
