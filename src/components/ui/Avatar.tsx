import Image from 'next/image';
import { Profile } from '@/types';
import styles from './Avatar.module.css';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizes: Record<AvatarSize, number> = {
  xs: 28, sm: 36, md: 44, lg: 64, xl: 96, '2xl': 128,
};

interface AvatarProps {
  profile: Profile | null | undefined;
  size?: AvatarSize;
  className?: string;
  isOnline?: boolean;
}

export default function Avatar({ profile, size = 'md', className, isOnline }: AvatarProps) {
  const px = sizes[size];
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : profile?.username?.[0]?.toUpperCase() ?? '?';

  const renderContent = () => {
    if (profile?.avatar_url) {
      return (
        <Image
          src={profile.avatar_url}
          alt={profile.full_name || profile.username}
          width={px}
          height={px}
          className={`${styles.avatar} ${styles[size]} ${className ?? ''}`}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }

    // Generate a consistent gradient based on username
    const colors = [
      ['#7c3aed', '#a78bfa'],
      ['#0ea5e9', '#38bdf8'],
      ['#10b981', '#34d399'],
      ['#f59e0b', '#fcd34d'],
      ['#ef4444', '#f87171'],
      ['#ec4899', '#f9a8d4'],
    ];
    const colorIndex = (profile?.username?.charCodeAt(0) ?? 0) % colors.length;
    const [from, to] = colors[colorIndex];

    return (
      <div
        className={`${styles.avatar} ${styles[size]} ${className ?? ''}`}
        style={{
          width: px,
          height: px,
          background: `linear-gradient(135deg, ${from}, ${to})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          color: 'white',
          fontWeight: 700,
          fontSize: px * 0.38,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {renderContent()}
      {isOnline && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: px * 0.25,
            height: px * 0.25,
            minWidth: 10,
            minHeight: 10,
            backgroundColor: '#10b981', // green-500
            border: '2px solid var(--bg-default)',
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  );
}
