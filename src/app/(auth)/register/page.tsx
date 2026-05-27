'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getURL } from '@/lib/supabase/utils';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    username: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (form.username.length < 3) {
      toast.error('Username phải có ít nhất 3 ký tự!');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          username: form.username.toLowerCase(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Tài khoản đã được tạo! Kiểm tra email để xác nhận. 📧');
      router.push('/login');
    }

    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setOauthLoading(null);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Đăng ký</h1>
      <p className={styles.subtitle}>Tạo tài khoản Nexora miễn phí</p>

      <div className={styles.oauthGroup}>
        <button id="btn-google-register" className={styles.oauthBtn} onClick={() => handleOAuth('google')} disabled={!!oauthLoading}>
          {oauthLoading === 'google' ? (
            <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Tiếp tục với Google
        </button>

        <button id="btn-github-register" className={styles.oauthBtn} onClick={() => handleOAuth('github')} disabled={!!oauthLoading}>
          {oauthLoading === 'github' ? (
            <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
            </svg>
          )}
          Tiếp tục với GitHub
        </button>
      </div>

      <div className="divider-text" style={{ margin: 'var(--space-5) 0' }}>hoặc đăng ký bằng email</div>

      <form onSubmit={handleRegister} className={styles.form}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="full_name">Họ và tên</label>
            <input id="full_name" type="text" className="form-input" placeholder="Nguyễn Văn A" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" type="text" className="form-input" placeholder="nguyenvana" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })} required />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" className="form-input" placeholder="your@email.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
          <div className={styles.inputWrapper}>
            <input id="reg-password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Ít nhất 6 ký tự" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" style={{ paddingRight: '40px' }} />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Xác nhận mật khẩu</label>
          <div className={styles.inputWrapper}>
            <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required autoComplete="new-password" style={{ paddingRight: '40px' }} />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button id="btn-submit-register" type="submit" className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading} style={{ marginTop: 'var(--space-2)', padding: '14px' }}>
          {loading ? (
            <>
              <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
              Đang tạo tài khoản...
            </>
          ) : 'Tạo tài khoản'}
        </button>
      </form>

      <p className={styles.switchAuth}>
        Đã có tài khoản?{' '}
        <Link href="/login" className={styles.authLink}>Đăng nhập</Link>
      </p>
    </div>
  );
}
