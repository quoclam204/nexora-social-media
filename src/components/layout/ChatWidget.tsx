'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, Conversation, Message } from '@/types';
import { Send, X, Maximize2, Minimize2, Edit, MessageSquare, ChevronLeft, Mic, Image as ImageIcon, Smile, Sticker, ChevronDown, ExternalLink } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { usePresence } from '@/store/usePresence';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import styles from './ChatWidget.module.css';

const MOCK_STICKERS = [
  'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
  'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
  'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
  'https://media.giphy.com/media/y0NFayaBeiWEU/giphy.gif',
  'https://media.giphy.com/media/11sBLVxIRvnMQ8/giphy.gif',
  'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif'
];

interface ChatWidgetProps {
  profile: Profile | null;
}

export default function ChatWidget({ profile }: ChatWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();
  const { isOnline } = usePresence();

  useEffect(() => {
    if (!profile) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [profile.id])
        .order('last_message_at', { ascending: false });

      if (data) {
        const enriched = await Promise.all(
          data.map(async (conv) => {
            const otherId = conv.participants.find((id: string) => id !== profile.id);
            const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).single();
            return { ...conv, other_user: otherUser };
          })
        );
        setConversations(enriched as any);
      }
    };

    fetchConversations();

    const channel = supabase
      .channel('widget_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as any);

    if (profile) {
      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', convId).neq('sender_id', profile.id);
    }
  };

  const handleSelectConv = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`widget_messages:${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        () => fetchMessages(conv.id))
      .subscribe();

    channelRef.current = channel;
  };

  useEffect(() => {
    if (selectedConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedConv || (!newMessage.trim() && !selectedImage)) return;
    setSending(true);

    let uploadedImageUrl = null;
    if (selectedImage) {
      const ext = selectedImage.name.split('.').pop();
      const path = `${selectedConv.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('messages').upload(path, selectedImage);
      if (!error) {
        const { data: signedData } = await supabase.storage.from('messages').createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedData) {
          uploadedImageUrl = signedData.signedUrl;
        }
      }
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: profile.id,
      content: newMessage.trim(),
      image_url: uploadedImageUrl,
    });

    if (!error) {
      await supabase.from('conversations').update({
        last_message: uploadedImageUrl ? '[Hình ảnh]' : newMessage.trim(),
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv.id);
      setNewMessage('');
      setSelectedImage(null);
      fetchMessages(selectedConv.id);
    } else {
      toast.error('Không thể gửi tin nhắn');
    }
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const path = `${selectedConv?.id}/${Date.now()}.webm`;
        setSending(true);
        const { error } = await supabase.storage.from('messages').upload(path, audioBlob);
        if (!error) {
          const { data: signedData } = await supabase.storage.from('messages').createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signedData && profile && selectedConv) {
            await supabase.from('messages').insert({
              conversation_id: selectedConv.id,
              sender_id: profile.id,
              content: '',
              image_url: signedData.signedUrl,
            });
            await supabase.from('conversations').update({
              last_message: '[Tin nhắn thoại]',
              last_message_at: new Date().toISOString(),
            }).eq('id', selectedConv.id);
            fetchMessages(selectedConv.id);
          }
        } else {
          toast.error('Lỗi khi gửi tin nhắn thoại');
        }
        setSending(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone', error);
      toast.error('Không thể truy cập microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const sendSticker = async (stickerUrl: string) => {
    if (!profile || !selectedConv) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: profile.id,
      content: '',
      image_url: stickerUrl,
    });
    if (!error) {
      await supabase.from('conversations').update({
        last_message: '[Nhãn dán]',
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv.id);
      fetchMessages(selectedConv.id);
      setShowStickerPicker(false);
    } else {
      toast.error('Không thể gửi nhãn dán');
    }
    setSending(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target as Node)) {
        setShowStickerPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!profile || pathname === '/messages' || pathname?.startsWith('/messages/')) return null;

  if (!isOpen) {
    const recentUsers = conversations.slice(0, 3).map(c => c.other_user).filter(Boolean);

    return (
      <button className={styles.collapsedPill} onClick={() => setIsOpen(true)}>
        <div className={styles.pillIcon}>
          <Send size={20} strokeWidth={2} />
        </div>
        <span className={styles.pillText}>Tin nhắn</span>
        {recentUsers.length > 0 && (
          <div className={styles.pillAvatars}>
            {recentUsers.map((user, i) => (
              <div key={user?.id} className={styles.pillAvatarWrapper} style={{ zIndex: 10 - i }}>
                <Avatar profile={user} size="xs" isOnline={isOnline(user?.id || '')} />
              </div>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`${styles.widgetContainer} ${isMinimized ? styles.minimized : ''}`}>
      {/* Header */}
      <div
        className={styles.header}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            if (selectedConv && selectedConv.other_user) {
              router.push(`/messages?user=${selectedConv.other_user.username}`);
            } else {
              router.push('/messages');
            }
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {selectedConv ? (
          <div className={styles.headerLeft}>
            <button className={styles.iconBtn} onClick={() => setSelectedConv(null)}>
              <ChevronLeft size={20} />
            </button>
            <Link
              href={selectedConv?.other_user?.username ? `/profile/${selectedConv.other_user.username}` : '#'}
              className={styles.userInfoWrapper}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedConv?.other_user?.username) {
                  setIsOpen(false);
                } else {
                  e.preventDefault();
                }
              }}
            >
              <Avatar profile={selectedConv.other_user} size="xs" isOnline={isOnline(selectedConv.other_user?.id || '')} />
              <div className={styles.chatTitleInfo}>
                <div className={styles.chatName}>{selectedConv.other_user?.full_name || selectedConv.other_user?.username}</div>
                <div className={styles.chatStatus}>
                  {isOnline(selectedConv.other_user?.id || '') ? 'Đang hoạt động' :
                    `Hoạt động ${selectedConv.other_user?.last_seen ? formatDistanceToNow(new Date(selectedConv.other_user.last_seen), { locale: vi }) : 'gần đây'} trước`}
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <h3 className={styles.title}>Tin nhắn</h3>
        )}
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => {
              if (selectedConv && selectedConv.other_user) {
                router.push(`/messages?user=${selectedConv.other_user.username}`);
              } else {
                router.push('/messages');
              }
            }}
            title="Mở toàn màn hình"
          >
            <Maximize2 size={18} />
          </button>
          <button className={styles.iconBtn} onClick={() => setIsOpen(false)} title="Đóng">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className={styles.body}>
          {selectedConv ? (
            <div className={styles.chatView}>
              <div className={styles.messagesList}>
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === profile.id;
                  const isLast = idx === messages.length - 1;
                  const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 3600000;

                  return (
                    <div key={msg.id} className={styles.messageRow}>
                      {showTime && (
                        <div className={styles.timeDivider}>
                          {format(new Date(msg.created_at), 'HH:mm d MMMM, yyyy', { locale: vi })}
                        </div>
                      )}
                      <div className={`${styles.messageWrapper} ${isMe ? styles.messageMe : styles.messageThem}`}>
                        {!isMe && <Avatar profile={(msg as any).sender} size="xs" />}
                        <div className={styles.messageContent}>
                          {msg.image_url && (
                            (msg.image_url.includes('.webm') || msg.image_url.includes('audio')) ? (
                              <div className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                                <audio controls src={msg.image_url} style={{ maxWidth: '100%', outline: 'none' }} />
                              </div>
                            ) : (
                              <div style={{ borderRadius: 16, overflow: 'hidden', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                                <img src={msg.image_url} alt="Media" style={{ display: 'block', maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} />
                              </div>
                            )
                          )}
                          {msg.content && (
                            <div
                              className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}
                              style={{ marginTop: msg.image_url ? 4 : 0 }}
                            >
                              {msg.content}
                            </div>
                          )}
                          {isLast && isMe && msg.read && <div className={styles.readStatus}>Đã xem</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className={styles.inputArea} onSubmit={sendMessage}>
                {selectedImage && (
                  <div className={styles.previewWrapper}>
                    <img src={URL.createObjectURL(selectedImage)} alt="Preview" className={styles.previewImage} />
                    <button type="button" className={styles.closePreview} onClick={() => setSelectedImage(null)}><X size={14} /></button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => setSelectedImage(e.target.files?.[0] || null)}
                />

                <div className={styles.inputWrapper}>
                  <div ref={emojiPickerRef}>
                    <button
                      type="button"
                      className={styles.inputIconBtn}
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                    >
                      <Smile size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div className={styles.emojiPickerWrapper}>
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setNewMessage(prev => prev + emojiData.emoji);
                          }}
                          width={300}
                          height={400}
                        />
                      </div>
                    )}
                  </div>

                  {isRecording ? (
                    <div className={styles.recordingIndicator}>
                      <div className={styles.recordingDot} />
                      Đang ghi âm...
                    </div>
                  ) : (
                    <input
                      type="text"
                      className={styles.messageInput}
                      placeholder="Nhắn tin..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                    />
                  )}

                  <div className={styles.inputActionsRight}>
                    {isRecording ? (
                      <button type="button" className={styles.inputIconBtn} onClick={stopRecording} style={{ color: 'var(--color-danger, #ef4444)' }}>
                        <X size={20} />
                      </button>
                    ) : (newMessage.trim() || selectedImage) ? (
                      <button type="submit" className={styles.sendBtn} disabled={sending}>
                        <Send size={18} />
                      </button>
                    ) : (
                      <>
                        <button type="button" className={styles.inputIconBtn} onClick={startRecording}><Mic size={20} /></button>
                        <button type="button" className={styles.inputIconBtn} onClick={() => fileInputRef.current?.click()}><ImageIcon size={20} /></button>
                        <div ref={stickerPickerRef} style={{ position: 'relative' }}>
                          <button type="button" className={styles.inputIconBtn} onClick={() => setShowStickerPicker(!showStickerPicker)}><Sticker size={20} /></button>
                          {showStickerPicker && (
                            <div className={styles.stickerGrid}>
                              {MOCK_STICKERS.map((sticker, idx) => (
                                <img key={idx} src={sticker} alt="Sticker" onClick={() => sendSticker(sticker)} />
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <>
              {conversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <MessageSquare size={32} />
                  <p>Chưa có tin nhắn</p>
                </div>
              ) : (
                <div className={styles.convList}>
                  {conversations.map(conv => (
                    <div key={conv.id} className={styles.convItem} onClick={() => handleSelectConv(conv)}>
                      <Avatar profile={conv.other_user} size="md" isOnline={isOnline(conv.other_user?.id || '')} />
                      <div className={styles.convInfo}>
                        <div className={styles.convName}>{conv.other_user?.full_name || conv.other_user?.username}</div>
                        <div className={styles.convTime}>
                          Hoạt động {conv.other_user?.last_seen ? formatDistanceToNow(new Date(conv.other_user.last_seen), { locale: vi }) : 'gần đây'} trước
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className={styles.fab}>
                <Edit size={20} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
