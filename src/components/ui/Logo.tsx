'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  href?: string | null;
}

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
  href = '/'
}: LogoProps) {
  const content = (
    <div className={`${styles.logoContainer} ${styles[size]} ${className}`}>
      <div className={styles.iconWrapper}>
        <Image
          src="/logo.png"
          alt="Nexora Logo"
          width={100}
          height={100}
          className={styles.imageLogo}
          priority
        />
      </div>
      {showText && <span className={`${styles.text} logo-text`}>Nexora</span>}
    </div>
  );

  if (href) {
    return <Link href={href} className={styles.linkWrapper}>{content}</Link>;
  }

  return content;
}
