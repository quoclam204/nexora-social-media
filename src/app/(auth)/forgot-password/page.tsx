'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getURL } from '@/lib/supabase/utils';
import toast from 'react-hot-toast';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getURL()}auth/callback?next=/update-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>📧</div>
        <h1 className={styles.title}>Kiểm tra email!</h1>
        <p className={styles.subtitle} style={{ marginBottom: 'var(--space-6)' }}>
          Chúng tôi đã gửi link đặt lại mật khẩu tới <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
        </p>
        <Link href="/login" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
          ← Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 'var(--space-4)' }}>🔑</div>
      <h1 className={styles.title}>Quên mật khẩu?</h1>
      <p className={styles.subtitle}>Nhập email để nhận link đặt lại mật khẩu</p>

      <form onSubmit={handleReset} className={styles.form}>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            className="form-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button
          id="btn-reset-password"
          type="submit"
          className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading}
          style={{ padding: '14px' }}
        >
          {loading ? (
            <>
              <span className="animate-spin" style={{ display: 'block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
              Đang gửi...
            </>
          ) : 'Gửi link đặt lại'}
        </button>
      </form>

      <p className={styles.switchAuth}>
        <Link href="/login" className={styles.authLink}>← Quay lại đăng nhập</Link>
      </p>
    </div>
  );
}
