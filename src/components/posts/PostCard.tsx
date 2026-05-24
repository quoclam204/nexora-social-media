'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Post, Profile, REACTION_EMOJIS, ReactionType } from '@/types';
import { Heart, MessageCircle, Send, Link as LinkIcon, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import CommentsSection from '@/components/posts/CommentsSection';
import CreatePostModal from '@/components/posts/CreatePostModal';
import LikesModal from '@/components/posts/LikesModal';
import ImageModal from '@/components/ui/ImageModal';
import toast from 'react-hot-toast';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: Post;
  currentProfile: Profile | null;
  onDeleted?: (id: string) => void;
  style?: React.CSSProperties;
}

export default function PostCard({ post, currentProfile, onDeleted, style }: PostCardProps) {
  const router = useRouter();
  const [reactions, setReactions] = useState(post.reactions_count ?? 0);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    (post.user_reaction as ReactionType) ?? null
  );
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClient();
  const isOwner = currentProfile?.id === post.user_id;

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !videoRef.current?.paused) {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.2 } // Trigger when less than 20% of the video is visible
    );

    observer.observe(videoRef.current);

    return () => {
      observer.disconnect();
    };
  }, [post.video_url]);

  const requireAuth = () => {
    if (!currentProfile) {
      toast.error('Vui lòng đăng nhập để thực hiện');
      router.push('/login');
      return false;
    }
    return true;
  };

  const handleReact = async (type: ReactionType) => {
    if (!requireAuth() || !currentProfile) return;

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
                <LinkIcon size={16} /> Xem chi tiết
              </Link>
              {isOwner && (
                <>
                  <button className="dropdown-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                    <Edit2 size={16} /> Chỉnh sửa bài viết
                  </button>
                  <button className="dropdown-item danger" onClick={handleDelete}>
                    <Trash2 size={16} /> Xóa bài viết
                  </button>
                </>
              )}
              {!isOwner && (
                <button className="dropdown-item" onClick={() => { toast('Đã báo cáo!'); setShowMenu(false); }}>
                  <AlertTriangle size={16} /> Báo cáo
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
            <div 
              key={i} 
              className={styles.imageWrapper} 
              style={{ cursor: 'pointer', ...(post.image_urls!.length === 1 ? { background: 'none' } : {}) }}
              onClick={() => setSelectedImage(url)}
            >
              {post.image_urls!.length === 1 ? (
                <Image
                  src={url}
                  alt={`Post image ${i + 1}`}
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain' }}
                />
              ) : (
                <Image
                  src={url}
                  alt={`Post image ${i + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              )}
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
          <video 
            ref={videoRef}
            src={post.video_url} 
            controls 
            style={{ width: '100%', maxHeight: 400, backgroundColor: '#000' }} 
          />
        </div>
      )}



      {/* Actions */}
      <div className={styles.actions}>
        {/* Reaction button */}
        <div
          id={`btn-like-${post.id}`}
          className={`${styles.actionBtn} ${userReaction === 'like' ? styles.liked : ''}`}
          onClick={() => handleReact('like')}
        >
          <Heart size={20} fill={userReaction === 'like' ? 'currentColor' : 'none'} />
          {reactions > 0 && (
            <span 
              className={styles.count}
              onClick={(e) => {
                e.stopPropagation();
                setShowLikesModal(true);
              }}
            >
              {reactions}
            </span>
          )}
        </div>

        <div
          id={`btn-comment-${post.id}`}
          className={styles.actionBtn}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={20} />
          {commentsCount > 0 && <span className={styles.count}>{commentsCount}</span>}
        </div>

        <div
          id={`btn-share-${post.id}`}
          className={styles.actionBtn}
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
            toast.success('Đã sao chép link!');
          }}
        >
          <Send size={20} />
        </div>
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

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Likes Modal */}
      {showLikesModal && (
        <LikesModal
          postId={post.id}
          onClose={() => setShowLikesModal(false)}
        />
      )}
    </article>
  );
}
