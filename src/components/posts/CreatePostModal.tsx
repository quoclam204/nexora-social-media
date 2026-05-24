'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Post, Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { Image as ImageIcon, Smile, Rocket, Info, Lightbulb, Globe, Users, Lock, ChevronDown } from 'lucide-react';
import styles from './CreatePostModal.module.css';
import Image from 'next/image';

interface CreatePostModalProps {
  profile: Profile | null;
  editPost?: Post;
  onClose: () => void;
  onCreated: () => void;
}

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Công khai', icon: Globe },
  { value: 'friends', label: 'Bạn bè', icon: Users },
  { value: 'private', label: 'Riêng tư', icon: Lock },
];

const EMOJI_QUICK = ['😊', '😂', '❤️', '🔥', '👍', '😭', '🥺', '✨', '🎉', '💯'];

export default function CreatePostModal({ profile, editPost, onClose, onCreated }: CreatePostModalProps) {
  const [content, setContent] = useState(editPost?.content || '');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>(editPost?.privacy || 'public');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close privacy dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(event.target as Node)) {
        setShowPrivacyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setMediaFiles(files);
    const newPreviews = files.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image' as 'image' | 'video'
    }));
    setPreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<{ images: string[], video: string | null }> => {
    const imageUrls: string[] = [];
    let videoUrl: string | null = null;

    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop();
      const path = `${profile!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('posts').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('posts').getPublicUrl(path);
        if (file.type.startsWith('video/')) {
          videoUrl = data.publicUrl;
        } else {
          imageUrls.push(data.publicUrl);
        }
      }
    }
    return { images: imageUrls, video: videoUrl };
  };

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[\w\u00C0-\u024F]+/g) ?? [];
    return matches.map(t => t.slice(1).toLowerCase());
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0 && !editPost?.image_urls && !editPost?.video_url) {
      toast.error('Vui lòng nhập nội dung hoặc thêm media!');
      return;
    }
    setLoading(true);

    try {
      const uploaded = mediaFiles.length > 0 ? await uploadMedia() : { images: [], video: null };
      
      const newImageUrls = mediaFiles.length > 0 ? uploaded.images : editPost?.image_urls;
      const newVideoUrl = mediaFiles.length > 0 ? uploaded.video : editPost?.video_url;

      let post;
      if (editPost) {
        const { data, error } = await supabase
          .from('posts')
          .update({ content: content.trim(), privacy })
          .eq('id', editPost.id)
          .select()
          .single();
        if (error) throw error;
        post = data;
      } else {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: profile!.id,
            content: content.trim(),
            image_urls: newImageUrls?.length ? newImageUrls : null,
            video_url: newVideoUrl,
            privacy,
          })
          .select()
          .single();
        if (error) throw error;
        post = data;
      }

      // Handle hashtags
      const tags = extractHashtags(content);
      for (const tag of tags) {
        let { data: hashtag } = await supabase
          .from('hashtags')
          .select('id, posts_count')
          .eq('name', tag)
          .single();

        if (!hashtag) {
          const { data: newTag } = await supabase
            .from('hashtags')
            .insert({ name: tag, posts_count: 1 })
            .select('id, posts_count')
            .single();
          hashtag = newTag;
        } else {
          await supabase.from('hashtags').update({ posts_count: (hashtag.posts_count ?? 0) + 1 }).eq('id', hashtag.id);
        }


        if (hashtag && post) {
          await supabase.from('post_hashtags').insert({ post_id: post.id, hashtag_id: hashtag.id });
        }
      }

      toast.success(editPost ? 'Đã cập nhật bài viết!' : 'Đã đăng bài viết! 🎉');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{editPost ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Author & Privacy */}
          <div className={styles.authorRow}>
            <Avatar profile={profile} size="md" />
            <div>
              <div className={styles.authorName}>{profile?.full_name || profile?.username}</div>
              <div className={styles.privacyDropdownContainer} ref={privacyRef}>
                <button
                  className={styles.privacySelect}
                  onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                  type="button"
                >
                  {(() => {
                    const selectedOption = PRIVACY_OPTIONS.find(o => o.value === privacy) || PRIVACY_OPTIONS[0];
                    const Icon = selectedOption.icon;
                    return (
                      <>
                        <Icon size={14} />
                        {selectedOption.label}
                        <ChevronDown size={14} />
                      </>
                    );
                  })()}
                </button>
                {showPrivacyDropdown && (
                  <div className={styles.privacyDropdownMenu}>
                    {PRIVACY_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          className={`${styles.privacyOption} ${privacy === opt.value ? styles.privacyOptionActive : ''}`}
                          onClick={() => {
                            setPrivacy(opt.value as any);
                            setShowPrivacyDropdown(false);
                          }}
                          type="button"
                        >
                          <Icon size={16} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <textarea
            className={styles.textarea}
            placeholder="Bạn đang nghĩ gì? Dùng #hashtag để phân loại..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            maxLength={2000}
            autoFocus
            id="post-content"
          />

          {/* Character count */}
          <div className={styles.charCount}>
            <span style={{ color: content.length > 1800 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
              {content.length}/2000
            </span>
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div className={styles.emojiPicker}>
              {EMOJI_QUICK.map(emoji => (
                <button
                  key={emoji}
                  className={styles.emojiBtn}
                  onClick={() => { setContent(prev => prev + emoji); setShowEmoji(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Media previews */}
          {previews.length > 0 && (
            <div className={styles.imagePreviews}>
              {previews.map((preview, i) => (
                <div key={i} className={styles.imagePreview}>
                  {preview.type === 'video' ? (
                    <video src={preview.url} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8 }} muted />
                  ) : (
                    <Image src={preview.url} alt={`Preview ${i}`} width={160} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <button className={styles.removeImage} onClick={() => removeImage(i)}>×</button>
                </div>
              ))}
            </div>
          )}

          {editPost && (editPost.image_urls || editPost.video_url) && previews.length === 0 && (
            <div className={styles.hashtagHint} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Info size={16} /></span>
              <span>Đang giữ nguyên media hiện tại của bài viết.</span>
            </div>
          )}

          {/* Hashtag suggestions */}
          {content.includes('#') && (
            <div className={styles.hashtagHint}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Lightbulb size={16} /></span>
              <span>Hashtags sẽ được tự động thêm vào bài viết</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.toolBar}>
            <button
              className={`btn btn-ghost btn-icon ${styles.toolBtn}`}
              onClick={() => fileInputRef.current?.click()}
              title="Thêm ảnh/video"
              disabled={!!editPost} // Disable changing media when editing for simplicity
            >
              <ImageIcon size={20} strokeWidth={1.5} />
            </button>
            <button
              className={`btn btn-ghost btn-icon ${styles.toolBtn}`}
              onClick={() => setShowEmoji(!showEmoji)}
              title="Emoji"
            >
              <Smile size={20} strokeWidth={1.5} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              multiple
              onChange={handleImageChange}
              style={{ display: 'none' }}
              id="post-images"
            />
          </div>

          <button
            id="btn-submit-post"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && mediaFiles.length === 0 && !editPost?.image_urls && !editPost?.video_url)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: 'block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' }} />
                Đang lưu...
              </>
            ) : editPost ? '✓ Lưu' : (
              <>
                <Rocket size={16} strokeWidth={2} /> Đăng bài
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
