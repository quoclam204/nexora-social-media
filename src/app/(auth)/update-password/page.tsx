'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      router.push('/');
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
          <div className={styles.inputWrapper}>
            <input id="new-password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Ít nhất 6 ký tự"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus style={{ paddingRight: '40px' }} />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-new-password">Xác nhận mật khẩu</label>
          <div className={styles.inputWrapper}>
            <input id="confirm-new-password" type={showConfirmPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={{ paddingRight: '40px' }} />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button id="btn-update-password" type="submit" className={`btn btn-primary w-full ${loading ? 'btn-loading' : ''}`}
          disabled={loading} style={{ padding: '14px', marginTop: 'var(--space-2)' }}>
          {loading ? 'Đang cập nhật...' : '✓ Cập nhật mật khẩu'}
        </button>
      </form>
    </div>
  );
}
