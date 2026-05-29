'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './Sidebar.module.css';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import { Search, Bell, MessageSquare, Hash, Edit3, Send, LogOut, UserCircle, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import SearchPanel from './SearchPanel';
import NotificationPanel from './NotificationPanel';

interface SidebarProps {
  profile: Profile | null;
  isAdmin?: boolean;
}

function HomeIcon({ size = 22, fill, strokeWidth, ...props }: any) {
  const active = fill === 'currentColor';
  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
        {...props}
      >
        <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.657a2 2 0 0 0-3.999 0V22a1 1 0 0 1-1 1H3.999A1 1 0 0 1 3 22V10.053a1 1 0 0 1 .38-.788l8-6.2a1 1 0 0 1 1.24 0l8 6.2a1 1 0 0 1 .38.788V22a1 1 0 0 1-1 1Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      {...props}
    >
      <path d="M22 9L12 2 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

const navItems = [
  { href: '/', label: 'Trang chủ', icon: HomeIcon },
  { href: '/search', label: 'Tìm kiếm', icon: Search },
  { href: '/notifications', label: 'Thông báo', icon: Bell },
  { href: '/messages', label: 'Tin nhắn', icon: Send },
  { href: '/hashtags', label: 'Hashtag', icon: Hash },
];

export default function Sidebar({ profile, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hideBadge, setHideBadge] = useState(false);

  const isPanelOpen = showSearchPanel || showNotificationPanel;

  useEffect(() => {
    if (!profile) return;

    const fetchUnreadCount = async () => {
      const lastSeenStr = localStorage.getItem('last_seen_notifications');
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      if (lastSeenStr) {
        query = query.gt('created_at', lastSeenStr);
      } else {
        query = query.eq('read', false);
      }

      const { count } = await query;
      
      if (count !== null) setUnreadCount(count);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('sidebar-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => {
          setUnreadCount((prev) => prev + 1);
          setHideBadge(false); // Show badge again on new notification
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Đã đăng xuất');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={`${styles.sidebar} ${isPanelOpen ? styles.panelOpen : ''}`}>
      {/* Logo */}
      <div className={styles.logoWrapper}>
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          if (!profile && (item.href === '/notifications' || item.href === '/messages')) return null;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={(e) => {
                if (item.href === '/search') {
                  e.preventDefault();
                  setShowSearchPanel(true);
                  setShowNotificationPanel(false);
                } else if (item.href === '/notifications' && profile) {
                  e.preventDefault();
                  if (item.label === 'Thông báo') {
                    if (showSearchPanel) setShowSearchPanel(false);
                    const willOpen = !showNotificationPanel;
                    setShowNotificationPanel(willOpen);
                    if (willOpen) {
                      setHideBadge(true);
                      setUnreadCount(0);
                      localStorage.setItem('last_seen_notifications', new Date().toISOString());
                    }
                    return;
                  }
                }
              }}
            >
              <span className={styles.navIcon}>
                <Icon
                  size={26}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive && (item.href === '/' || item.href === '/notifications') ? 'currentColor' : 'none'}
                />
                {item.href === '/notifications' && unreadCount > 0 && !hideBadge && (
                  <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className={`${styles.navItem} ${pathname.startsWith('/profile') ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>
              <Avatar profile={profile} size="xs" />
            </span>
            <span className={styles.navLabel}>Trang cá nhân</span>
          </Link>
        )}
      </nav>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', paddingBottom: 'var(--space-4)' }}>
        {isAdmin && (
          <Link
            href="/admin"
            className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>
              <Shield
                size={26}
                strokeWidth={pathname === '/admin' ? 2.5 : 2}
                fill={pathname === '/admin' ? 'currentColor' : 'none'}
              />
            </span>
            <span className={styles.navLabel}>Quản trị</span>
          </Link>
        )}

        {profile && (
          <Link href="/?create=true" id="btn-create-post-sidebar" className={styles.navItem}>
            <span className={styles.navIcon}><Edit3 size={26} strokeWidth={2} /></span>
            <span className={styles.navLabel}>Tạo bài viết</span>
          </Link>
        )}

        {profile ? (
          <div
            id="btn-logout"
            className={styles.navItem}
            onClick={handleLogout}
            style={{ width: '100%' }}
            role="button"
          >
            <span className={styles.navIcon}><LogOut size={26} strokeWidth={2} /></span>
            <span className={styles.navLabel}>Đăng xuất</span>
          </div>
        ) : (
          <Link
            href="/login"
            className={styles.navItem}
            style={{ width: '100%', color: 'var(--color-primary-light)' }}
          >
            <span className={styles.navIcon}><UserCircle size={26} strokeWidth={2} /></span>
            <span className={styles.navLabel}>Đăng nhập</span>
          </Link>
        )}
      </div>
      {/* Search Panel */}
      <SearchPanel isOpen={showSearchPanel} onClose={() => setShowSearchPanel(false)} />

      {/* Notification Panel */}
      <NotificationPanel isOpen={showNotificationPanel} onClose={() => setShowNotificationPanel(false)} profile={profile} />
    </aside>
  );
}
