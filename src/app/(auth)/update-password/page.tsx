'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import styles from '../login/login.module.css';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Mật khẩu không khớp!'); return; }
    if (password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự!'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Đã đổi mật khẩu thành công! 🎉');
      router.push('/feed');
    }
    setLoading(false);
  };

  return (
    <div className={styles.card}>
      <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 'var(--space-4)' }}>🔑</div>
      <h1 className={styles.title}>Đặt mật khẩu mới</h1>
      <p className={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn</p>

      <form onSubmit={handleUpdate} className={styles.form}>
        <div className="form-group">
          <label className="form-label" htmlFor="new-password">Mật khẩu mới</label>
          <input id="new-password" type="password" className="form-input" placeholder="Ít nhất 6 ký tự"
            value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-new-password">Xác nhận mật khẩu</label>
          <input id="confirm-new-password" type="password" className="form-input" placeholder="••••••••"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button id="btn-update-password" type="submit" className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading} style={{ padding: '14px', marginTop: 'var(--space-2)' }}>
          {loading ? 'Đang cập nhật...' : '✓ Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  );
}
