'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Notification, Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import styles from './notifications.module.css';

const NOTIF_MESSAGES: Record<string, string> = {
  like: 'đã thích bài viết của bạn',
  comment: 'đã bình luận bài viết của bạn',
  follow: 'bắt đầu theo dõi bạn',
  mention: 'đã đề cập đến bạn',
  reply: 'đã trả lời bình luận của bạn',
};

const NOTIF_ICONS: Record<string, string> = {
  like: '❤️', comment: '💬', follow: '👤', mention: '📣', reply: '↩️',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);

      fetchNotifications(user.id);

      // Realtime
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => fetchNotifications(user.id))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setNotifications(data as any);
    setLoading(false);
  };

  const markAllRead = async () => {
    if (!currentUser) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Thông báo</h1>
            {unreadCount > 0 && (
              <span className="badge badge-primary">{unreadCount} mới</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button id="btn-mark-all-read" className="btn btn-ghost btn-sm" onClick={markAllRead}>
              ✓ Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {loading ? (
          <div className={styles.list}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 56 }}>🔔</div>
            <h3>Không có thông báo nào</h3>
            <p>Khi có người thích hoặc bình luận bài viết của bạn, bạn sẽ thấy ở đây</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((notif) => (
              <Link
                key={notif.id}
                href={notif.post_id ? `/posts/${notif.post_id}` : `/profile/${(notif as any).actor?.username}`}
                className={`${styles.item} ${!notif.read ? styles.unread : ''}`}
                onClick={async () => {
                  if (!notif.read) {
                    await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                  }
                }}
              >
                <div className={styles.iconWrapper}>
                  <Avatar profile={(notif as any).actor} size="md" />
                  <span className={styles.typeIcon}>{NOTIF_ICONS[notif.type]}</span>
                </div>
                <div className={styles.itemContent}>
                  <p className={styles.message}>
                    <strong>{(notif as any).actor?.full_name || (notif as any).actor?.username}</strong>{' '}
                    {NOTIF_MESSAGES[notif.type]}
                  </p>
                  <span className={styles.time}>
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: vi })}
                  </span>
                </div>
                {!notif.read && <div className={styles.unreadDot} />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
