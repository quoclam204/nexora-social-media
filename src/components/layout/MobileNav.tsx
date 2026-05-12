'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import styles from './MobileNav.module.css';

const navItems = [
  { href: '/', label: 'Home', icon: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { href: '/search', label: 'Search', icon: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )},
  { href: '/notifications', label: 'Alerts', icon: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )},
  { href: '/messages', label: 'Messages', icon: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )},
];

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => {
        if (!profile && (item.href === '/notifications' || item.href === '/messages')) return null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${
              item.href === '/' 
                ? pathname === '/' 
                : pathname.startsWith(item.href) 
              ? styles.active : ''}`}
          >
            {item.icon}
          </Link>
        );
      })}
      {profile ? (
        <Link
          href={`/profile/${profile.username}`}
          className={`${styles.navItem} ${pathname.startsWith('/profile') ? styles.active : ''}`}
        >
          <Avatar profile={profile} size="xs" />
        </Link>
      ) : (
        <Link href="/login" className={styles.navItem}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </Link>
      )}
    </nav>
  );
}
