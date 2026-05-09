'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Partial<Profile>) => void;
}

export default function EditProfileModal({ profile, onClose, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    website: profile.website || '',
    username: profile.username || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let avatar_url = profile.avatar_url;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      avatar_url = data.publicUrl + `?t=${Date.now()}`;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...form, avatar_url })
      .eq('id', profile.id);

    if (error) {
      toast.error('Không thể cập nhật hồ sơ: ' + error.message);
    } else {
      toast.success('Hồ sơ đã được cập nhật! ✨');
      onSaved({ ...form, avatar_url });
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Chỉnh sửa hồ sơ</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Avatar upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ position: 'relative' }}>
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Preview" width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <Avatar profile={profile} size="xl" />
              )}
            </div>
            <label htmlFor="avatar-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              📷 Đổi ảnh đại diện
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-full-name">Họ và tên</label>
            <input id="edit-full-name" type="text" className="form-input" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Họ và tên của bạn" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-username">Username</label>
            <input id="edit-username" type="text" className="form-input" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '').toLowerCase() })}
              placeholder="username" minLength={3} maxLength={30} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-bio">Giới thiệu</label>
            <textarea id="edit-bio" className="form-input form-textarea" value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Giới thiệu về bản thân..." rows={3} maxLength={200} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-website">Website</label>
            <input id="edit-website" type="url" className="form-input" value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://yourwebsite.com" />
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button id="btn-save-profile" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
