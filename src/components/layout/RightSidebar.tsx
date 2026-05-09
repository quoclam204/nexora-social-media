'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { usePresence } from '@/store/usePresence';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
import styles from './RightSidebar.module.css';

export default function RightSidebar() {
  const pathname = usePathname();
  const isMessages = pathname?.startsWith('/messages');
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = usePresence();
  const supabase = createClient();

  useEffect(() => {
    if (isMessages) {
      document.body.style.setProperty('--current-right-panel-width', '0px');
    } else {
      document.body.style.setProperty('--current-right-panel-width', 'var(--right-panel-width)');
    }
  }, [isMessages]);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest mode fallback
        const { data: recentProfiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (recentProfiles) setContacts(recentProfiles);
        setLoading(false);
        return;
      }

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', followingIds)
          .order('last_seen', { ascending: false });

        if (profiles) setContacts(profiles);
      } else {
        const { data: recentProfiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (recentProfiles) setContacts(recentProfiles);
      }
      setLoading(false);
    };

    fetchContacts();
  }, [supabase]);

  if (isMessages) return null;

  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Người liên hệ</h2>
      </div>

      <div className={styles.section}>
        {loading ? (
          <div className={styles.loading}>
            <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-muted text-sm text-center">Chưa có liên hệ nào</p>
        ) : (
          <div className={styles.userList}>
            {contacts.map(profile => {
              const online = isOnline(profile.id);
              return (
                <Link key={profile.id} href={`/messages?user=${profile.username}`} className={styles.userItem}>
                  <Avatar profile={profile} size="sm" isOnline={online} />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{profile.full_name || profile.username}</span>
                    <span className={`${styles.userStatus} ${online ? styles.online : ''}`}>
                      {online ? 'Đang hoạt động' : profile.last_seen ? `Hoạt động ${formatDistanceToNow(new Date(profile.last_seen), { locale: vi })} trước` : 'Ngoại tuyến'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
