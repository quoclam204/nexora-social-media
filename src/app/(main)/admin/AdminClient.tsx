'use client';

import { useState, useEffect } from 'react';
import { Profile, Post } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { deletePostAction, deleteUserAction, toggleHidePostAction } from './actions';
import styles from './admin.module.css';
import { Users, FileText, AlertTriangle, Trash2, Eye, Shield, Activity, Calendar, BarChart2, EyeOff } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AdminClientProps {
  stats: { usersCount: number; postsCount: number; reportsCount: number };
  recentPosts: any[];
  recentUsers: Profile[];
  chartData: any[];
}

export default function AdminClient({ stats, recentPosts, recentUsers, chartData }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'posts' | 'users'>('overview');
  const [posts, setPosts] = useState(recentPosts);
  const [users, setUsers] = useState(recentUsers);

  // Keep state in sync with props when Next.js refreshes the router
  useEffect(() => {
    setPosts(recentPosts);
  }, [recentPosts]);

  useEffect(() => {
    setUsers(recentUsers);
  }, [recentUsers]);

  const deletePost = async (id: string) => {
    if (!confirm('Xóa bài viết này?')) return;
    const result = await deletePostAction(id);
    if (result.success) {
      setPosts(prev => prev.filter((p: Post) => p.id !== id));
      toast.success('Đã xóa bài viết');
    } else {
      toast.error(result.error || 'Có lỗi xảy ra');
    }
  };

  const toggleHidePost = async (id: string, currentPrivacy: string) => {
    const willHide = currentPrivacy !== 'private';
    if (!confirm(willHide ? 'Tạm ẩn bài viết này?' : 'Hiển thị lại bài viết này?')) return;
    
    const result = await toggleHidePostAction(id, willHide);
    if (result.success) {
      setPosts(prev => prev.map((p: Post) => p.id === id ? { ...p, privacy: willHide ? 'private' : 'public' } : p));
      toast.success(willHide ? 'Đã ẩn bài viết' : 'Đã hiển thị bài viết');
    } else {
      toast.error(result.error || 'Có lỗi xảy ra');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Xóa người dùng này? Hành động này không thể hoàn tác!')) return;
    const result = await deleteUserAction(id);
    if (result.success) {
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('Đã xóa người dùng');
    } else {
      toast.error(result.error || 'Có lỗi xảy ra');
    }
  };

  const statCards = [
    { label: 'Tổng người dùng', value: stats.usersCount, icon: Users, color: 'var(--color-primary)', bg: 'rgba(37, 99, 235, 0.1)' },
    { label: 'Tổng bài viết', value: stats.postsCount, icon: FileText, color: 'var(--color-secondary)', bg: 'rgba(14, 165, 233, 0.1)' },
    { label: 'Báo cáo chờ xử lý', value: stats.reportsCount, icon: AlertTriangle, color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)' },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Shield size={36} color="var(--color-primary)" />
          Quản trị hệ thống
        </h1>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.statCard} style={{ '--card-color': card.color } as any}>
              <div className={styles.iconWrapper} style={{ '--icon-bg': card.bg } as any}>
                <Icon size={28} />
              </div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{card.value.toLocaleString()}</div>
                <div className={styles.statLabel}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>
          <Activity size={18} /> Tổng quan
        </button>
        <button className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={18} /> Thống kê
        </button>
        <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
          <FileText size={18} /> Bài viết
        </button>
        <button className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={18} /> Người dùng
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><BarChart2 size={20} /> Hoạt động 7 ngày qua</h2>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderColor: 'var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)'
                  }} 
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="users" name="Người dùng mới" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="posts" name="Bài viết mới" stroke="var(--color-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPosts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className={styles.overviewGrid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}><FileText size={20} /> Bài viết gần đây</h2>
            </div>
            <div className={styles.list}>
              {posts.slice(0, 5).map((post: any) => (
                <div key={post.id} className={styles.listItem}>
                  <Avatar profile={post.profile} size="md" />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{post.content?.slice(0, 60) || '(No content)'}...</span>
                    <span className={styles.itemMeta}>
                      @{post.profile?.username} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  <div className={styles.actionButtons}>
                    <button className="btn btn-icon" onClick={() => toggleHidePost(post.id, post.privacy)} title={post.privacy === 'private' ? 'Hiện lại' : 'Tạm ẩn'}>
                      {post.privacy === 'private' ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button className="btn btn-icon btn-danger" onClick={() => deletePost(post.id)} title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}><Users size={20} /> Người dùng mới</h2>
            </div>
            <div className={styles.list}>
              {users.slice(0, 5).map(user => (
                <div key={user.id} className={styles.listItem}>
                  <Avatar profile={user} size="md" />
                  <div className={styles.itemInfo}>
                    <Link href={`/profile/${user.username}`} className={styles.itemTitle}>
                      {user.full_name || user.username}
                    </Link>
                    <span className={styles.itemMeta}>@{user.username}</span>
                  </div>
                  <div className={styles.actionButtons}>
                    <button className="btn btn-icon btn-danger" onClick={() => deleteUser(user.id)} title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
             <h2 className={styles.sectionTitle}><FileText size={20} /> Tất cả bài viết</h2>
          </div>
          <div className={styles.list}>
            {posts.map((post: any) => (
              <div key={post.id} className={styles.listItem}>
                <Avatar profile={post.profile} size="md" />
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{post.content?.slice(0, 100) || '(No text)'}...</span>
                  <span className={styles.itemMeta}>
                    <Calendar size={14} /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                    {' • '}@{post.profile?.username} {' • '}{post.privacy}
                  </span>
                </div>
                <div className={styles.actionButtons}>
                  <Link href={`/posts/${post.id}`} className="btn btn-icon" title="Xem bài viết">
                    <Eye size={18} />
                  </Link>
                  <button className="btn btn-icon" onClick={() => toggleHidePost(post.id, post.privacy)} title={post.privacy === 'private' ? 'Hiện lại' : 'Tạm ẩn'}>
                    {post.privacy === 'private' ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button className="btn btn-icon btn-danger" onClick={() => deletePost(post.id)} title="Xóa bài viết">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
             <h2 className={styles.sectionTitle}><Users size={20} /> Tất cả người dùng</h2>
          </div>
          <div className={styles.list}>
            {users.map(user => (
              <div key={user.id} className={styles.listItem}>
                <Avatar profile={user} size="md" />
                <div className={styles.itemInfo}>
                  <Link href={`/profile/${user.username}`} className={styles.itemTitle}>
                    {user.full_name || user.username}
                  </Link>
                  <span className={styles.itemMeta}>
                    <Calendar size={14} /> Tham gia {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: vi })}
                    {' • '}@{user.username}
                  </span>
                </div>
                <div className={styles.actionButtons}>
                  <Link href={`/profile/${user.username}`} className="btn btn-icon" title="Xem hồ sơ">
                    <Eye size={18} />
                  </Link>
                  <button className="btn btn-icon btn-danger" onClick={() => deleteUser(user.id)} title="Xóa người dùng">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
