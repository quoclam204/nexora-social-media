'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import styles from './Sidebar.module.css';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';

interface SidebarProps {
  profile: Profile | null;
}

const navItems = [
  { href: '/feed', label: 'Trang chủ', icon: '🏠' },
  { href: '/search', label: 'Tìm kiếm', icon: '🔍' },
  { href: '/notifications', label: 'Thông báo', icon: '🔔' },
  { href: '/messages', label: 'Tin nhắn', icon: '✉️' },
  { href: '/hashtags', label: 'Hashtag', icon: '#️⃣' },
];

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Đã đăng xuất');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoWrapper}>
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          if (!profile && (item.href === '/notifications' || item.href === '/messages')) return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href || pathname.startsWith(item.href + '/') ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className={`${styles.navItem} ${pathname.startsWith('/profile') ? styles.active : ''}`}
          >
            <Avatar profile={profile} size="sm" />
            <span className={styles.navLabel}>Trang cá nhân</span>
          </Link>
        )}
      </nav>

      {/* Create Post Button */}
      {profile && (
        <Link href="/feed?create=true" id="btn-create-post-sidebar" className={`btn btn-primary ${styles.createBtn}`}>
          ✏️ Tạo bài viết
        </Link>
      )}

      {/* User Footer or Login */}
      {profile ? (
        <div className={styles.userFooter}>
          <Link href={`/profile/${profile.username}`} className={styles.userInfo}>
            <Avatar profile={profile} size="sm" />
            <div className={styles.userText}>
              <span className={styles.userName}>{profile.full_name || profile.username}</span>
              <span className={styles.userHandle}>@{profile.username}</span>
            </div>
          </Link>
          <button
            id="btn-logout"
            className={`btn btn-ghost btn-icon`}
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={styles.userFooter} style={{ justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary w-full">
            Đăng nhập / Đăng ký
          </Link>
        </div>
      )}
    </aside>
  );
}
