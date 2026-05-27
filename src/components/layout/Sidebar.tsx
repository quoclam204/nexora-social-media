'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './Sidebar.module.css';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import { Search, Bell, MessageSquare, Hash, Edit3, Send, LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';
import SearchPanel from './SearchPanel';
import NotificationPanel from './NotificationPanel';

interface SidebarProps {
  profile: Profile | null;
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

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const isPanelOpen = showSearchPanel || showNotificationPanel;

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
                  setShowNotificationPanel(true);
                  setShowSearchPanel(false);
                }
              }}
            >
              <span className={styles.navIcon}>
                <Icon 
                  size={26} 
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive && (item.href === '/' || item.href === '/notifications') ? 'currentColor' : 'none'} 
                />
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

      {/* Create Post Button */}
      {profile && (
        <Link href="/?create=true" id="btn-create-post-sidebar" className={styles.navItem}>
          <span className={styles.navIcon}><Edit3 size={26} strokeWidth={2} /></span>
          <span className={styles.navLabel}>Tạo bài viết</span>
        </Link>
      )}

      {/* User Footer or Login */}
      {profile ? (
        <div style={{ marginTop: 'auto', paddingBottom: 'var(--space-4)' }}>
          <button
            id="btn-logout"
            className={styles.navItem}
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            <span className={styles.navIcon}><LogOut size={26} strokeWidth={2} /></span>
            <span className={styles.navLabel}>Đăng xuất</span>
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 'auto', paddingBottom: 'var(--space-4)' }}>
          <Link
            href="/login"
            className={styles.navItem}
            style={{ width: '100%', color: 'var(--color-primary-light)' }}
          >
            <span className={styles.navIcon}><UserCircle size={26} strokeWidth={2} /></span>
            <span className={styles.navLabel}>Đăng nhập</span>
          </Link>
        </div>
      )}
      {/* Search Panel */}
      <SearchPanel isOpen={showSearchPanel} onClose={() => setShowSearchPanel(false)} />
      
      {/* Notification Panel */}
      <NotificationPanel isOpen={showNotificationPanel} onClose={() => setShowNotificationPanel(false)} profile={profile} />
    </aside>
  );
}
