import type { Metadata } from 'next';
import styles from './auth.module.css';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in or create your Nexora account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authBackground}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>
      <div className={styles.authContent}>
        <div className={styles.brandHeader}>
          <div className={styles.logo}>N</div>
          <span className={styles.brandName}>Nexora</span>
        </div>
        {children}
      </div>
    </div>
  );
}
