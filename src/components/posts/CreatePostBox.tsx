'use client';

import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { Image as ImageIcon, Film, Smile } from 'lucide-react';
import styles from './CreatePostBox.module.css';

interface CreatePostBoxProps {
  profile: Profile | null;
  onOpen: () => void;
}

export default function CreatePostBox({ profile, onOpen }: CreatePostBoxProps) {
  return (
    <div className={styles.box} onClick={onOpen} role="button" id="create-post-box">
      <Avatar profile={profile} size="md" />
      <div className={styles.input}>
        <span>Bạn đang nghĩ gì?</span>
      </div>
      <div className={styles.actions}>
        <span className={styles.action} title="Thêm ảnh"><ImageIcon size={20} strokeWidth={1.5} /></span>
        <span className={styles.action} title="Thêm video"><Film size={20} strokeWidth={1.5} /></span>
        <span className={styles.action} title="Cảm xúc"><Smile size={20} strokeWidth={1.5} /></span>
      </div>
    </div>
  );
}
