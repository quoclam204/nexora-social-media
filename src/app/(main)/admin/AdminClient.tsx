'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Post } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from './admin.module.css';

interface AdminClientProps {
  stats: { usersCount: number; postsCount: number; reportsCount: number };
  recentPosts: any[];
  recentUsers: Profile[];
}

export default function AdminClient({ stats, recentPosts, recentUsers }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'users'>('overview');
  const [posts, setPosts] = useState(recentPosts);
  const [users, setUsers] = useState(recentUsers);
  const supabase = createClient();

  const deletePost = async (id: string) => {
    if (!confirm('Xóa bài viết này?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
      setPosts(prev => prev.filter((p: Post) => p.id !== id));
      toast.success('Đã xóa bài viết');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Xóa người dùng này? Hành động này không thể hoàn tác!')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('Đã xóa người dùng');
    }
  };

  const statCards = [
    { label: 'Tổng người dùng', value: stats.usersCount, icon: '👤', color: '#7c3aed' },
    { label: 'Tổng bài viết', value: stats.postsCount, icon: '📝', color: '#06b6d4' },
    { label: 'Báo cáo chờ xử lý', value: stats.reportsCount, icon: '🚨', color: '#ef4444' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h1 className={styles.title}>⚡ Admin Dashboard</h1>

        {/* Stat Cards */}
        <div className={styles.statsGrid}>
          {statCards.map(card => (
            <div key={card.label} className={styles.statCard} style={{ '--card-color': card.color } as any}>
              <div className={styles.statIcon}>{card.icon}</div>
              <div>
                <div className={styles.statValue}>{card.value.toLocaleString()}</div>
                <div className={styles.statLabel}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Tổng quan</button>
          <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>📝 Bài viết</button>
          <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👤 Người dùng</button>
        </div>

        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Bài viết gần đây</h2>
              <div className={styles.list}>
                {recentPosts.slice(0, 5).map((post: any) => (
                  <div key={post.id} className={styles.listItem}>
                    <Avatar profile={post.profile} size="sm" />
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{post.content?.slice(0, 60) || '(No content)'}...</span>
                      <span className={styles.itemMeta}>
                        @{post.profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePost(post.id)}>Xóa</button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Người dùng mới</h2>
              <div className={styles.list}>
                {recentUsers.slice(0, 5).map(user => (
                  <div key={user.id} className={styles.listItem}>
                    <Avatar profile={user} size="sm" />
                    <div className={styles.itemInfo}>
                      <Link href={`/profile/${user.username}`} className={styles.itemTitle} style={{ color: 'var(--text-primary)' }}>
                        {user.full_name || user.username}
                      </Link>
                      <span className={styles.itemMeta}>@{user.username}</span>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(user.id)}>Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className={styles.section}>
            <div className={styles.list}>
              {posts.map((post: any) => (
                <div key={post.id} className={styles.listItem}>
                  <Avatar profile={post.profile} size="sm" />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{post.content?.slice(0, 80) || '(No text)'}...</span>
                    <span className={styles.itemMeta}>
                      @{post.profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })} · {post.privacy}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link href={`/posts/${post.id}`} className="btn btn-secondary btn-sm">Xem</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePost(post.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={styles.section}>
            <div className={styles.list}>
              {users.map(user => (
                <div key={user.id} className={styles.listItem}>
                  <Avatar profile={user} size="sm" />
                  <div className={styles.itemInfo}>
                    <Link href={`/profile/${user.username}`} className={styles.itemTitle}>
                      {user.full_name || user.username}
                    </Link>
                    <span className={styles.itemMeta}>
                      @{user.username} · Tham gia {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteUser(user.id)}>Xóa</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
