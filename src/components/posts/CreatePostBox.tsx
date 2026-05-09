'use client';

import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
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
        <span className={styles.action} title="Thêm ảnh">🖼️</span>
        <span className={styles.action} title="Thêm video">🎬</span>
        <span className={styles.action} title="Cảm xúc">😊</span>
      </div>
    </div>
  );
}
