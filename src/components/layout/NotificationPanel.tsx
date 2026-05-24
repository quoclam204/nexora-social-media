'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, Bell, Heart, MessageCircle, UserPlus, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import styles from './NotificationPanel.module.css';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
}

export default function NotificationPanel({ isOpen, onClose, profile }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && profile) {
      fetchNotifications();
    }
  }, [isOpen, profile]);

  const fetchNotifications = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch notifications (assuming you have a notifications table or similar logic)
    // Since notifications might not be fully implemented in DB, we'll fetch them if they exist
    // or show an empty state for now.
    const { data } = await supabase
      .from('notifications')
      .select('*, sender:profiles!notifications_actor_id_fkey(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>Thông báo</h2>
          <button className="btn btn-ghost btn-icon" title="Tùy chọn">
            <MoreHorizontal size={24} />
          </button>
        </div>

        <div className={styles.filters}>
          <button className={`${styles.filterPill} ${styles.active}`}>Tất cả</button>
          <button className={styles.filterPill}>Chưa đọc</button>
        </div>

        <div className={styles.sectionHeader}>
          <h3>Trước đó</h3>
          <button className={styles.seeAll}>Xem tất cả</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
              <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={48} strokeWidth={1.5} />
              <p>Chưa có thông báo nào.</p>
            </div>
          ) : (
            <div className={styles.notificationList}>
              {notifications.map((notif) => {
                let IconComponent = Heart;
                let iconClass = styles.iconLike;
                
                if (notif.type === 'comment') {
                  IconComponent = MessageCircle;
                  iconClass = styles.iconComment;
                } else if (notif.type === 'follow') {
                  IconComponent = UserPlus;
                  iconClass = styles.iconFollow;
                }
                
                return (
                  <Link
                    key={notif.id}
                    href={notif.post_id ? `/posts/${notif.post_id}` : `/profile/${notif.sender?.username}`}
                    className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}
                    onClick={onClose}
                  >
                    <div className={styles.avatarWrapper}>
                      <Avatar profile={notif.sender} size="lg" />
                      <div className={`${styles.actionIcon} ${iconClass}`}>
                        <IconComponent fill={notif.type === 'like' ? 'currentColor' : 'none'} strokeWidth={notif.type === 'like' ? 0 : 2} />
                      </div>
                    </div>
                    
                    <div className={styles.notificationInfo}>
                      <div className={styles.notificationText}>
                        <strong>{notif.sender?.full_name || notif.sender?.username}</strong>
                        {' '}
                        {notif.type === 'like' && 'đã thích bài viết của bạn.'}
                        {notif.type === 'comment' && 'đã bình luận về bài viết của bạn.'}
                        {notif.type === 'follow' && 'đã bắt đầu theo dõi bạn.'}
                      </div>
                      <div className={styles.notificationTime}>
                        {formatTime(notif.created_at)}
                      </div>
                    </div>
                    
                    {!notif.is_read && <div className={styles.unreadDot} />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
