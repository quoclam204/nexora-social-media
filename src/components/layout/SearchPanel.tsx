'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Post } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import styles from './SearchPanel.module.css';
import { useRouter } from 'next/navigation';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ users: Profile[], posts: Post[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const saved = localStorage.getItem('nexora_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      setLoading(true);

      const [usersRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('*').ilike('full_name', `%${query}%`).limit(5),
        supabase.from('posts').select('*, profile:profiles(*)').ilike('content', `%${query}%`).limit(5)
      ]);

      setResults({
        users: usersRes.data || [],
        posts: postsRes.data || []
      });
      setLoading(false);
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('nexora_recent_searches', JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('nexora_recent_searches');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>Tìm kiếm</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.inputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.input}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  saveRecentSearch(query.trim());
                  // Optionally redirect to a full search page
                }
              }}
            />
            {query && (
              <button className={styles.clearInput} onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.content}>
          {query.trim() === '' ? (
            <div className={styles.recentSection}>
              <div className={styles.recentHeader}>
                <h3>Mới đây</h3>
                {recentSearches.length > 0 && (
                  <button className={styles.clearRecentBtn} onClick={clearRecent}>Xóa tất cả</button>
                )}
              </div>
              {recentSearches.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Không có nội dung tìm kiếm mới đây.</p>
                </div>
              ) : (
                <div className={styles.recentList}>
                  {recentSearches.map((term, i) => (
                    <div key={i} className={styles.recentItem} onClick={() => setQuery(term)}>
                      <Search size={16} className="text-muted" />
                      <span>{term}</span>
                      <button className={styles.removeRecent} onClick={(e) => {
                        e.stopPropagation();
                        const updated = recentSearches.filter(s => s !== term);
                        setRecentSearches(updated);
                        localStorage.setItem('nexora_recent_searches', JSON.stringify(updated));
                      }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className={styles.loading}>
              <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
            </div>
          ) : results ? (
            <div className={styles.results}>
              {results.users.length > 0 && (
                <div className={styles.resultGroup}>
                  <h4>Người dùng</h4>
                  {results.users.map(user => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.username}`}
                      className={styles.resultItem}
                      onClick={() => {
                        saveRecentSearch(query.trim());
                        onClose();
                      }}
                    >
                      <Avatar profile={user} size="sm" />
                      <div className={styles.resultInfo}>
                        <div className={styles.resultName}>{user.full_name || user.username}</div>
                        <div className={styles.resultSub}>@{user.username}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div className={styles.resultGroup}>
                  <h4>Bài viết</h4>
                  {results.posts.map(post => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className={styles.resultItem}
                      onClick={() => {
                        saveRecentSearch(query.trim());
                        onClose();
                      }}
                    >
                      <Avatar profile={post.profile || null} size="sm" />
                      <div className={styles.resultInfo}>
                        <div className={styles.resultName}>{post.profile?.full_name || post.profile?.username}</div>
                        <div className={styles.resultSub}>{post.content?.substring(0, 40)}{post.content && post.content.length > 40 ? '...' : ''}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.users.length === 0 && results.posts.length === 0 && (
                <div className={styles.emptyState}>
                  <p>Không tìm thấy kết quả nào cho &quot;{query}&quot;.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
