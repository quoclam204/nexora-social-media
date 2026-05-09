'use client';

export const dynamic = 'force-dynamic';


import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getURL } from '@/lib/supabase/utils';
import toast from 'react-hot-toast';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Chào mừng trở lại! 👋');
      router.push('/feed');
      router.refresh();
    }

    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getURL()}auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setOauthLoading(null);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Đăng nhập</h1>
      <p className={styles.subtitle}>Chào mừng trở lại Nexora!</p>

      {/* OAuth buttons */}
      <div className={styles.oauthGroup}>
        <button
          id="btn-google-login"
          className={styles.oauthBtn}
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'google' ? (
            <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Tiếp tục với Google
        </button>

        <button
          id="btn-github-login"
          className={styles.oauthBtn}
          onClick={() => handleOAuth('github')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'github' ? (
            <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
            </svg>
          )}
          Tiếp tục với GitHub
        </button>
      </div>

      <div className="divider-text" style={{ margin: 'var(--space-5) 0' }}>
        hoặc đăng nhập bằng email
      </div>

      <form onSubmit={handleLogin} className={styles.form}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <div className={styles.passwordLabel}>
            <label className="form-label" htmlFor="password">Mật khẩu</label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          id="btn-submit-login"
          type="submit"
          className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading}
          style={{ marginTop: 'var(--space-2)', padding: '14px' }}
        >
          {loading ? (
            <>
              <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
              Đang đăng nhập...
            </>
          ) : 'Đăng nhập'}
        </button>
      </form>

      <p className={styles.switchAuth}>
        Chưa có tài khoản?{' '}
        <Link href="/register" className={styles.authLink}>Đăng ký ngay</Link>
      </p>
    </div>
  );
}
