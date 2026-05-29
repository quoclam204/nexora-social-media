'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Comment, Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import styles from './CommentsSection.module.css';

interface CommentsSectionProps {
  postId: string;
  currentProfile: Profile | null;
  onCountChange: (count: number) => void;
}

interface CommentItemProps {
  comment: Comment;
  currentProfile: Profile | null;
  onReply: (username: string, parentId: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}

function CommentItem({ comment, currentProfile, onReply, onEdit, onDelete, depth = 0 }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi });
  const isOwner = currentProfile?.id === comment.user_id;

  return (
    <div className={`${styles.comment} ${depth > 0 ? styles.reply : ''}`}>
      <Avatar profile={comment.profile} size={depth > 0 ? 'xs' : 'sm'} />
      <div className={styles.commentBody}>
        {isEditing ? (
          <div className={styles.editWrapper}>
            <input
              type="text"
              className={styles.input}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className={styles.editActions}>
              <button className="btn btn-primary btn-sm" onClick={() => { onEdit(comment.id, editContent); setIsEditing(false); }}>Lưu</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>Hủy</button>
            </div>
          </div>
        ) : (
          <div className={styles.commentBubble}>
            <div className={styles.commentAuthor}>
              {comment.profile?.full_name || comment.profile?.username}
            </div>
            <p className={styles.commentText}>{comment.content}</p>
          </div>
        )}
        <div className={styles.commentMeta}>
          <span>{timeAgo}</span>
          {!isEditing && (
            <button className={styles.metaBtn} onClick={() => onReply(comment.profile?.username ?? '', comment.id)}>
              Trả lời
            </button>
          )}
          {isOwner && !isEditing && (
            <>
              <button className={styles.metaBtn} onClick={() => setIsEditing(true)}>
                Sửa
              </button>
              <button className={`${styles.metaBtn} ${styles.deleteBtn}`} onClick={() => onDelete(comment.id)}>
                Xóa
              </button>
            </>
          )}
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className={styles.replies}>
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentProfile={currentProfile}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentsSection({ postId, currentProfile, onCountChange }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ username: string; parentId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profile:profiles(*)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (data) {
      const withReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select('*, profile:profiles(*)')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });
          return { ...comment, replies: replies ?? [] };
        })
      );
      setComments(withReplies);
      const total = withReplies.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
      onCountChange(total);
    }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    
    // Initial fetch
    fetchComments();

    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => {
          if (isMounted) fetchComments();
        })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) { toast.error('Đăng nhập để bình luận!'); return; }
    if (!input.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: currentProfile.id,
      content: replyTo ? `@${replyTo.username} ${input.trim()}` : input.trim(),
      parent_id: replyTo?.parentId ?? null,
    });

    if (!error) {
      setInput('');
      setReplyTo(null);
      fetchComments();
    } else {
      toast.error('Không thể gửi bình luận');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id);
    fetchComments();
    toast.success('Đã xóa bình luận');
  };

  const handleEdit = async (id: string, newContent: string) => {
    if (!newContent.trim()) return;
    const { error } = await supabase.from('comments').update({ content: newContent.trim(), updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) {
      toast.success('Đã cập nhật bình luận');
      fetchComments(); // Optional: Realtime channel might auto-update, but we can force it
    } else {
      toast.error('Không thể cập nhật bình luận');
    }
  };

  const handleReply = (username: string, parentId: string) => {
    setReplyTo({ username, parentId });
    setInput(`@${username} `);
  };

  return (
    <div className={styles.section}>
      {/* Comment Input */}
      {currentProfile ? (
        <form onSubmit={handleSubmit} className={styles.inputRow}>
          <Avatar profile={currentProfile} size="sm" />
          <div className={styles.inputWrapper}>
            {replyTo && (
              <div className={styles.replyIndicator}>
                Đang trả lời <strong>@{replyTo.username}</strong>
                <button type="button" onClick={() => { setReplyTo(null); setInput(''); }}>×</button>
              </div>
            )}
            <input
              type="text"
              className={styles.input}
              placeholder="Viết bình luận..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              id={`comment-input-${postId}`}
            />
            <button
              type="submit"
              className={`btn btn-primary btn-sm ${styles.sendBtn}`}
              disabled={submitting || !input.trim()}
            >
              {submitting ? '...' : '→'}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.inputRow} style={{ justifyContent: 'center', padding: '16px' }}>
          <p className="text-sm text-muted">
            Vui lòng <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>đăng nhập</Link> để bình luận.
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className={styles.loading}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className={styles.skeletonComment}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div className="skeleton" style={{ flex: 1, height: 60, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className={styles.commentList}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentProfile={currentProfile}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
