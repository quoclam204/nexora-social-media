'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post, Profile } from '@/types';
import PostCard from '@/components/posts/PostCard';
import CreatePostModal from '@/components/posts/CreatePostModal';
import CreatePostBox from '@/components/posts/CreatePostBox';
import FriendSuggestions from '@/components/profile/FriendSuggestions';
import { Edit3, Inbox } from 'lucide-react';
import styles from './feed.module.css';
import { useSearchParams, useRouter } from 'next/navigation';

interface FeedClientProps {
  currentProfile: Profile | null;
}

export default function FeedClient({ currentProfile }: FeedClientProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowModal(true);
      router.replace('/');
    }
  }, [searchParams, router]);

  const fetchPosts = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) setLoading(true);

    let query = supabase
      .from('posts')
      .select(`
        *,
        profile:profiles(*),
        reactions:reactions(count),
        comments:comments(count)
      `)
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (currentProfile) {
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentProfile.id);
      const blockedIds = blocks?.map(b => b.blocked_id) || [];
      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }
    }

    if (activeTab === 'following' && currentProfile) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentProfile.id);

      const followingIds = follows?.map(f => f.following_id) ?? [];
      if (followingIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setHasMore(false);
        return;
      }
      query = query.in('user_id', followingIds);
    }

    const { data, error } = await query;

    if (!error && data) {
      const enrichedPosts = data.map((p: any) => ({
        ...p,
        reactions_count: p.reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
      }));

      if (reset) {
        setPosts(enrichedPosts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...enrichedPosts]);
        setPage(prev => prev + 1);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
  }, [activeTab, currentProfile, page, supabase]);

  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Realtime subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        if (newPost.privacy === 'public') {
          fetchPosts(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostCreated = () => {
    setShowModal(false);
    fetchPosts(true);
  };

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.feedContainer}>
        {/* Tabs */}
        <div className={styles.feedHeader}>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'forYou' ? 'active' : ''}`}
              onClick={() => setActiveTab('forYou')}
            >
              Dành cho bạn
            </button>
            <button
              className={`tab ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Đang theo dõi
            </button>
          </div>
        </div>

        {/* Create Post Box */}
        {currentProfile && (
          <CreatePostBox profile={currentProfile} onOpen={() => setShowModal(true)} />
        )}

        {/* Posts */}
        {loading ? (
          <div className={styles.skeletonList}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.skeletonPost}>
                <div className={styles.skeletonHeader}>
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                    <div className="skeleton" style={{ height: 12, width: '25%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 60, marginTop: 12, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 36, marginTop: 12, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Inbox size={48} strokeWidth={1.5} /></div>
            <h3>Chưa có bài viết nào</h3>
            <p>{activeTab === 'following' ? 'Hãy theo dõi người dùng để xem bài viết của họ' : 'Hãy là người đầu tiên đăng bài!'}</p>
            {currentProfile && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} /> Tạo bài viết đầu tiên
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.postList}>
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentProfile={currentProfile}
                  onDeleted={handlePostDeleted}
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}
            </div>

            {hasMore && (
              <button
                className={`btn btn-secondary ${styles.loadMore}`}
                onClick={() => fetchPosts()}
              >
                Tải thêm bài viết
              </button>
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <FriendSuggestions currentProfile={currentProfile} />
      </aside>

      {/* Create Post Modal */}
      {showModal && (
        <CreatePostModal
          profile={currentProfile}
          onClose={() => setShowModal(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
