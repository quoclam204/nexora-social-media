'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Post, Profile, REACTION_EMOJIS, ReactionType } from '@/types';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import CommentsSection from '@/components/posts/CommentsSection';
import CreatePostModal from '@/components/posts/CreatePostModal';
import toast from 'react-hot-toast';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: Post;
  currentProfile: Profile | null;
  onDeleted?: (id: string) => void;
  style?: React.CSSProperties;
}

export default function PostCard({ post, currentProfile, onDeleted, style }: PostCardProps) {
  const [reactions, setReactions] = useState(post.reactions_count ?? 0);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    (post.user_reaction as ReactionType) ?? null
  );
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const supabase = createClient();
  const isOwner = currentProfile?.id === post.user_id;

  const handleReact = async (type: ReactionType) => {
    if (!currentProfile) { toast.error('Vui lòng đăng nhập!'); return; }

    setShowReactions(false);

    if (userReaction === type) {
      // Remove reaction
      await supabase.from('reactions').delete()
        .eq('post_id', post.id).eq('user_id', currentProfile.id);
      setUserReaction(null);
      setReactions(prev => Math.max(0, prev - 1));
    } else {
      // Upsert reaction
      await supabase.from('reactions').upsert({
        post_id: post.id,
        user_id: currentProfile.id,
        type,
      });
      if (!userReaction) setReactions(prev => prev + 1);
      setUserReaction(type);

      // Create notification
      if (post.user_id !== currentProfile.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: currentProfile.id,
          type: 'like',
          post_id: post.id,
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Xóa bài viết này?')) return;
    setShowMenu(false);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) {
      toast.success('Đã xóa bài viết');
      onDeleted?.(post.id);
    } else {
      toast.error('Không thể xóa bài viết');
    }
  };

  const profile = post.profile;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi });

  // Render content with hashtag highlighting
  const renderContent = (text: string) => {
    const parts = text.split(/(#[\w\u00C0-\u024F]+)/g);
    return parts.map((part, i) =>
      part.startsWith('#') ? (
        <Link key={i} href={`/hashtags/${part.slice(1)}`} className={styles.hashtag}>
          {part}
        </Link>
      ) : part
    );
  };

  return (
    <article className={`card ${styles.post} animate-fade-in`} style={style}>
      {/* Header */}
      <div className={styles.header}>
        <Link href={`/profile/${profile?.username}`} className={styles.authorLink}>
          <Avatar profile={profile} size="md" />
          <div className={styles.authorInfo}>
            <span className={styles.authorName}>{profile?.full_name || profile?.username}</span>
            <span className={styles.authorMeta}>
              @{profile?.username} · {timeAgo}
              {post.privacy !== 'public' && (
                <span className={styles.privacy}>
                  {post.privacy === 'friends' ? ' · 👥' : ' · 🔒'}
                </span>
              )}
            </span>
          </div>
        </Link>

        {/* Menu */}
        <div className="dropdown">
          <button
            className={`btn btn-ghost btn-icon ${styles.menuBtn}`}
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5c-.828 0-1.5-.672-1.5-1.5S11.172 2 12 2s1.5.672 1.5 1.5S12.828 5 12 5zm0 7c-.828 0-1.5-.672-1.5-1.5S11.172 9 12 9s1.5.672 1.5 1.5S12.828 12 12 12zm0 7c-.828 0-1.5-.672-1.5-1.5S11.172 16 12 16s1.5.672 1.5 1.5S12.828 19 12 19z"/>
            </svg>
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <Link href={`/posts/${post.id}`} className="dropdown-item" onClick={() => setShowMenu(false)}>
                🔗 Xem chi tiết
              </Link>
              {isOwner && (
                <>
                  <button className="dropdown-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                    ✏️ Chỉnh sửa bài viết
                  </button>
                  <button className="dropdown-item danger" onClick={handleDelete}>
                    🗑️ Xóa bài viết
                  </button>
                </>
              )}
              {!isOwner && (
                <button className="dropdown-item" onClick={() => { toast('Đã báo cáo!'); setShowMenu(false); }}>
                  🚨 Báo cáo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className={styles.content}>{renderContent(post.content)}</p>
      )}

      {/* Images */}
      {post.image_urls && post.image_urls.length > 0 && (
        <div className={`${styles.imageGrid} ${styles[`grid${post.image_urls.length}`]}`}>
          {post.image_urls.slice(0, 4).map((url, i) => (
            <div key={i} className={styles.imageWrapper}>
              <Image
                src={url}
                alt={`Post image ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
              />
              {i === 3 && post.image_urls!.length > 4 && (
                <div className={styles.moreImages}>+{post.image_urls!.length - 4}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {post.video_url && (
        <div className={styles.videoWrapper} style={{ marginTop: 'var(--space-3)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <video src={post.video_url} controls style={{ width: '100%', maxHeight: 400, backgroundColor: '#000' }} />
        </div>
      )}

      {/* Stats */}
      {(reactions > 0 || commentsCount > 0) && (
        <div className={styles.stats}>
          {reactions > 0 && <span>{reactions} lượt thích</span>}
          {commentsCount > 0 && (
            <button className={styles.statBtn} onClick={() => setShowComments(!showComments)}>
              {commentsCount} bình luận
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {/* Reaction button */}
        <div
          className={styles.reactionWrapper}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          <button
            id={`btn-like-${post.id}`}
            className={`${styles.actionBtn} ${userReaction ? styles.reacted : ''}`}
            onClick={() => handleReact(userReaction || 'like')}
          >
            <span>{userReaction ? REACTION_EMOJIS[userReaction] : '👍'}</span>
            <span>{userReaction ? userReaction : 'Thích'}</span>
          </button>

          {showReactions && (
            <div className={styles.reactionPicker}>
              {(Object.entries(REACTION_EMOJIS) as [ReactionType, string][]).map(([type, emoji]) => (
                <button
                  key={type}
                  className={`${styles.reactionOption} ${userReaction === type ? styles.activeReaction : ''}`}
                  onClick={() => handleReact(type)}
                  title={type}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          id={`btn-comment-${post.id}`}
          className={styles.actionBtn}
          onClick={() => setShowComments(!showComments)}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Bình luận</span>
        </button>

        <button
          id={`btn-share-${post.id}`}
          className={styles.actionBtn}
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
            toast.success('Đã sao chép link!');
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          currentProfile={currentProfile}
          onCountChange={setCommentsCount}
        />
      )}

      {/* Edit Post Modal */}
      {isEditing && (
        <CreatePostModal
          profile={currentProfile}
          editPost={post}
          onClose={() => setIsEditing(false)}
          onCreated={() => {
            setIsEditing(false);
            window.location.reload(); // Simple reload to refresh feed/post
          }}
        />
      )}
    </article>
  );
}
