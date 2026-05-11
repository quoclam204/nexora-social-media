'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import styles from './LikesModal.module.css';

interface LikesModalProps {
  postId: string;
  onClose: () => void;
}

export default function LikesModal({ postId, onClose }: LikesModalProps) {
  const [likes, setLikes] = useState<{ profile: Profile }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLikes = async () => {
      const { data, error } = await supabase
        .from('reactions')
        .select(`
          user_id,
          profile:profiles(*)
        `)
        .eq('post_id', postId);

      if (!error && data) {
        setLikes(data as any[]);
      }
      setLoading(false);
    };

    fetchLikes();
  }, [postId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Lượt thích</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loading}>
              <span className="animate-spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
            </div>
          ) : likes.length === 0 ? (
            <div className={styles.empty}>Chưa có lượt thích nào.</div>
          ) : (
            <div className={styles.list}>
              {likes.map((like, i) => (
                <Link key={i} href={`/profile/${like.profile.username}`} className={styles.userRow} onClick={onClose}>
                  <Avatar profile={like.profile} size="md" />
                  <div className={styles.userInfo}>
                    <span className={styles.fullName}>{like.profile.full_name || like.profile.username}</span>
                    <span className={styles.username}>@{like.profile.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
