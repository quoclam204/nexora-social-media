'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post, Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import PostCard from '@/components/posts/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import toast from 'react-hot-toast';
import { Edit3, Mail, Unlock, Ban, Link as LinkIcon, FileText, Image as ImageIcon, Inbox, MoreHorizontal } from 'lucide-react';
import styles from './profile.module.css';
import { useEffect } from 'react';

interface ProfileClientProps {
  profile: Profile;
  currentProfile: Profile | null;
}

export default function ProfileClient({ profile: initialProfile, currentProfile }: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(initialProfile.is_following ?? false);
  const [followersCount, setFollowersCount] = useState(initialProfile.followers_count ?? 0);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'media'>('posts');
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();
  const isOwner = currentProfile?.id === profile.id;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentProfile && !isOwner) {
        const { data: blockData } = await supabase.from('blocks').select('*')
          .eq('blocker_id', currentProfile.id).eq('blocked_id', profile.id).single();
        setIsBlocked(!!blockData);
      }

      const { data } = await supabase
        .from('posts')
        .select('*, profile:profiles(*), reactions:reactions(count), comments:comments(count)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPosts(data.map((p: any) => ({
          ...p,
          reactions_count: p.reactions?.[0]?.count ?? 0,
          comments_count: p.comments?.[0]?.count ?? 0,
        })));
      }
      setLoading(false);
    };
    fetchProfileData();
  }, [profile.id, currentProfile, isOwner, supabase]);

  const handleFollow = async () => {
    if (!currentProfile) { toast.error('Đăng nhập để theo dõi!'); return; }

    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentProfile.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      toast('Đã bỏ theo dõi');
    } else {
      await supabase.from('follows').insert({ follower_id: currentProfile.id, following_id: profile.id });
      await supabase.from('notifications').insert({
        user_id: profile.id, actor_id: currentProfile.id, type: 'follow',
      });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success(`Đang theo dõi @${profile.username}`);
    }
  };

  const handleBlock = async () => {
    if (!currentProfile) return;
    setShowMenu(false);

    if (isBlocked) {
      await supabase.from('blocks').delete().eq('blocker_id', currentProfile.id).eq('blocked_id', profile.id);
      setIsBlocked(false);
      toast.success('Đã bỏ chặn người dùng này');
    } else {
      if (!confirm('Bạn có chắc muốn chặn người dùng này? Bạn sẽ không thấy bài viết của họ nữa.')) return;
      await supabase.from('blocks').insert({ blocker_id: currentProfile.id, blocked_id: profile.id });
      
      // Auto unfollow
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentProfile.id).eq('following_id', profile.id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      }
      setIsBlocked(true);
      toast.success('Đã chặn người dùng này');
    }
  };

  const mediaPosts = posts.filter(p => p.image_urls && p.image_urls.length > 0);

  return (
    <div className={styles.wrapper}>
      {/* Cover / Header */}
      <div className={styles.cover}>
        <div className={styles.coverGradient} />
      </div>

      <div className={styles.profileSection}>
        <div className={styles.avatarWrapper}>
          <Avatar profile={profile} size="2xl" />
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.profileTop}>
            <div>
              <h1 className={styles.displayName}>{profile.full_name || profile.username}</h1>
              <span className={styles.handle}>@{profile.username}</span>
            </div>

            <div className={styles.profileActions}>
              {isOwner ? (
                <button
                  id="btn-edit-profile"
                  className="btn btn-secondary"
                  onClick={() => setShowEdit(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Edit3 size={16} /> Chỉnh sửa trang cá nhân
                </button>
              ) : (
                <>
                  <button
                    id={`btn-follow-${profile.username}`}
                    className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi'}
                  </button>
                  <a href={`/messages?user=${profile.username}`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} /> Nhắn tin
                  </a>
                  <div className="dropdown">
                    <button className="btn btn-secondary btn-icon" onClick={() => setShowMenu(!showMenu)}>
                      <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item danger" onClick={handleBlock}>
                          {isBlocked ? <><Unlock size={16} /> Bỏ chặn</> : <><Ban size={16} /> Chặn người dùng</>}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.website} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <LinkIcon size={14} /> {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{profile.posts_count ?? 0}</span>
              <span className={styles.statLabel}>Bài viết</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{followersCount}</span>
              <span className={styles.statLabel}>Người theo dõi</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>{profile.following_count ?? 0}</span>
              <span className={styles.statLabel}>Đang theo dõi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} /> Bài viết
        </button>
        <button className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={16} /> Ảnh/Video
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          </div>
        ) : isBlocked ? (
          <div className={styles.emptyState}>
            <div style={{ color: 'var(--text-muted)' }}><Ban size={48} strokeWidth={1.5} /></div>
            <p>Bạn đã chặn người dùng này</p>
          </div>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ color: 'var(--text-muted)' }}><Inbox size={48} strokeWidth={1.5} /></div>
              <p>{isOwner ? 'Bạn chưa đăng bài nào' : `${profile.full_name || profile.username} chưa đăng bài nào`}</p>
            </div>
          ) : (
            <div className={styles.postList}>
              {posts.map(post => (
                <PostCard key={post.id} post={post} currentProfile={currentProfile} onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
              ))}
            </div>
          )
        ) : (
          <div className={styles.mediaGrid}>
            {mediaPosts.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{ color: 'var(--text-muted)' }}><ImageIcon size={48} strokeWidth={1.5} /></div>
                <p>Chưa có ảnh nào</p>
              </div>
            ) : (
              mediaPosts.map(post =>
                post.image_urls?.map((url, i) => (
                  <a key={`${post.id}-${i}`} href={`/posts/${post.id}`} className={styles.mediaItem}>
                    <img src={url} alt="" loading="lazy" />
                  </a>
                ))
              )
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setProfile({ ...profile, ...updated }); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
