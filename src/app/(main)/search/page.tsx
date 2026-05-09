'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Post, Hashtag } from '@/types';
import Avatar from '@/components/ui/Avatar';
import PostCard from '@/components/posts/PostCard';
import Link from 'next/link';
import styles from './search.module.css';

type SearchType = 'posts' | 'users' | 'hashtags';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('posts');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [trending, setTrending] = useState<Hashtag[]>([]);
  const supabase = createClient();

  useState(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentProfile(data);
      }
      const { data: tags } = await supabase
        .from('hashtags')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(10);
      if (tags) setTrending(tags);
    };
    init();
  });

  const search = async (q: string, t: SearchType) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);

    let data: any[] = [];
    
    // Get blocked users
    let blockedIds: string[] = [];
    if (currentProfile) {
      const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentProfile.id);
      blockedIds = blocks?.map(b => b.blocked_id) || [];
    }

    if (t === 'users') {
      let qBuilder = supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
        
      if (blockedIds.length > 0) {
        qBuilder = qBuilder.not('id', 'in', `(${blockedIds.join(',')})`);
      }
      
      const { data: users } = await qBuilder.limit(20);
      data = users ?? [];
    } else if (t === 'posts') {
      let qBuilder = supabase
        .from('posts')
        .select('*, profile:profiles(*), reactions:reactions(count), comments:comments(count)')
        .ilike('content', `%${q}%`)
        .eq('privacy', 'public');
        
      if (blockedIds.length > 0) {
        qBuilder = qBuilder.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data: posts } = await qBuilder
        .order('created_at', { ascending: false })
        .limit(20);
        
      data = (posts ?? []).map((p: any) => ({
        ...p,
        reactions_count: p.reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
      }));
    } else {
      const { data: tags } = await supabase
        .from('hashtags')
        .select('*')
        .ilike('name', `%${q}%`)
        .order('posts_count', { ascending: false })
        .limit(20);
      data = tags ?? [];
    }

    setResults(data);
    setLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout((window as any)._searchTimeout);
    (window as any)._searchTimeout = setTimeout(() => search(q, type), 300);
  };

  const handleTypeChange = (t: SearchType) => {
    setType(t);
    if (query) search(query, t);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>Tìm kiếm</h1>

        {/* Search Input */}
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-input"
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm bài viết, người dùng, hashtag..."
            value={query}
            onChange={handleSearch}
            autoFocus
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => { setQuery(''); setResults([]); }}>×</button>
          )}
        </div>

        {/* Type Tabs */}
        <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
          {(['posts', 'users', 'hashtags'] as SearchType[]).map(t => (
            <button key={t} className={`tab ${type === t ? 'active' : ''}`} onClick={() => handleTypeChange(t)}>
              {t === 'posts' ? '📝 Bài viết' : t === 'users' ? '👤 Người dùng' : '#️⃣ Hashtag'}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className={styles.loading}>
            <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          </div>
        ) : !query ? (
          <div className={styles.trending}>
            <h2 className={styles.trendingTitle}>🔥 Trending Hashtags</h2>
            <div className={styles.trendingList}>
              {trending.map((tag, i) => (
                <Link key={tag.id} href={`/hashtags/${tag.name}`} className={styles.trendingItem}>
                  <div className={styles.trendingRank}>#{i + 1}</div>
                  <div>
                    <div className={styles.trendingTag}>#{tag.name}</div>
                    <div className={styles.trendingCount}>{tag.posts_count} bài viết</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <p>Không tìm thấy kết quả cho &quot;<strong>{query}</strong>&quot;</p>
          </div>
        ) : type === 'users' ? (
          <div className={styles.userList}>
            {results.map((user: Profile) => (
              <Link key={user.id} href={`/profile/${user.username}`} className={styles.userItem}>
                <Avatar profile={user} size="md" />
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.full_name || user.username}</span>
                  <span className={styles.userHandle}>@{user.username}</span>
                  {user.bio && <span className={styles.userBio}>{user.bio}</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : type === 'hashtags' ? (
          <div className={styles.hashtagList}>
            {results.map((tag: Hashtag) => (
              <Link key={tag.id} href={`/hashtags/${tag.name}`} className={styles.hashtagItem}>
                <div className={styles.hashtagIcon}>#</div>
                <div>
                  <div className={styles.hashtagName}>#{tag.name}</div>
                  <div className={styles.hashtagCount}>{tag.posts_count} bài viết</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {results.map((post: Post) => (
              <PostCard key={post.id} post={post} currentProfile={currentProfile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
