import type { Metadata } from 'next';
import Logo from '@/components/ui/Logo';
import styles from './auth.module.css';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in or create your Nexora account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authSplit}>
        
        {/* Left Side: Hero */}
        <div className={styles.authLeft}>
          <div className={styles.brandHeaderLeft}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.heroTitle}>
            Kết nối trọn vẹn từng khoảnh khắc cùng <span className={styles.gradientText}>người bạn yêu thương</span>.
          </h1>
          <div className={styles.heroImageContainer}>
             <img src="/images/auth-hero.png" alt="Hero Illustration" className={styles.heroImage} />
          </div>
        </div>

        {/* Right Side: Form */}
        <div className={styles.authRight}>
          <div className={styles.authFormWrapper}>
            {children}
          </div>
        </div>

      </div>

      <footer className={styles.authFooter}>
        <div className={styles.footerLinks}>
          <a href="#">Giới thiệu</a>
          <a href="#">Blog</a>
          <a href="#">Việc làm</a>
          <a href="#">Trợ giúp</a>
          <a href="#">API</a>
          <a href="#">Quyền riêng tư</a>
          <a href="#">Điều khoản</a>
          <a href="#">Vị trí</a>
          <a href="#">Nexora Lite</a>
          <a href="#">Tải thông tin</a>
        </div>
        <div className={styles.footerCopyright}>
          Tiếng Việt © 2026 Nexora
        </div>
      </footer>
    </div>
  );
}
