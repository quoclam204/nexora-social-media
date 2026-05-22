'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Message, Profile, Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import styles from './messages.module.css';
import Image from 'next/image';
import { usePresence } from '@/store/usePresence';
import EmojiPicker from 'emoji-picker-react';
import { Send, X, Mic, Image as ImageIcon, Smile, Sticker } from 'lucide-react';

const MOCK_STICKERS = [
  'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
  'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
  'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
  'https://media.giphy.com/media/y0NFayaBeiWEU/giphy.gif',
  'https://media.giphy.com/media/11sBLVxIRvnMQ8/giphy.gif',
  'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif'
];

export default function MessagesPage() {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();
  const { isOnline } = usePresence();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentProfile(profile);

      const urlParams = new URLSearchParams(window.location.search);
      const targetUsername = urlParams.get('user');

      if (targetUsername) {
        const { data: targetProfile } = await supabase.from('profiles').select('*').eq('username', targetUsername).single();
        if (targetProfile && targetProfile.id !== user.id) {
          const { data: existingConvs } = await supabase.from('conversations')
            .select('*')
            .contains('participants', [user.id, targetProfile.id]);

          if (!existingConvs || existingConvs.length === 0) {
            await supabase.from('conversations').insert({
              participants: [user.id, targetProfile.id],
              last_message_at: new Date().toISOString()
            });
          }
        }
      }

      await fetchConversations(user.id, targetUsername);
    };
    init();

    // Subscribe to conversation updates for the sidebar
    const convsChannel = supabase
      .channel('conversations_all')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) fetchConversations(user.id);
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) fetchConversations(user.id);
        });
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      supabase.removeChannel(convsChannel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickOutside = (event: MouseEvent) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
      setShowEmojiPicker(false);
    }
    if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target as Node)) {
      setShowStickerPicker(false);
    }
  };

  const fetchConversations = async (userId: string, targetUsername?: string | null) => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('last_message_at', { ascending: false });

    if (data) {
      let convToSelect = null;
      // Fetch other user profiles
      const enriched = await Promise.all(
        data.map(async (conv) => {
          const otherId = conv.participants.find((id: string) => id !== userId);
          const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).single();
          const { count: unread } = await supabase.from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read', false)
            .neq('sender_id', userId);
            
          const enrichedConv = { ...conv, other_user: otherUser, unread_count: unread ?? 0 };
          if (targetUsername && otherUser?.username === targetUsername) {
            convToSelect = enrichedConv;
          }
          return enrichedConv;
        })
      );
      setConversations(enriched as any);
      
      if (convToSelect) {
        selectConversation(convToSelect as any);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as any);

    // Mark as read
    if (currentProfile) {
      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', convId).neq('sender_id', currentProfile.id);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        () => fetchMessages(conv.id))
      .subscribe();

    channelRef.current = channel;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile || !selectedConv || (!newMessage.trim() && !selectedImage)) return;
    setSending(true);

    let uploadedImageUrl = null;
    if (selectedImage) {
      const ext = selectedImage.name.split('.').pop();
      const path = `${selectedConv.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('messages').upload(path, selectedImage);
      if (!error) {
        // Wait, messages bucket was created as NOT public. We need to create a signed URL or download it.
        // But since we want to view it easily in chat, let's use getPublicUrl if it works, 
        // or actually getPublicUrl only works for public buckets. 
        // For private bucket, we need createSignedUrl.
        // Since we are simulating a social app, let's just use createSignedUrl with a long expiry 
        // or modify the bucket to be public in the schema.
        // The schema says: insert into storage.buckets (id, name, public) values ('messages', 'messages', false)
        // Wait! We can use transform or signed url. Let's just createSignedUrl.
        const { data: signedData } = await supabase.storage.from('messages').createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
        if (signedData) {
          uploadedImageUrl = signedData.signedUrl;
        }
      }
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentProfile.id,
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
          if (signedData && currentProfile && selectedConv) {
             await supabase.from('messages').insert({
              conversation_id: selectedConv.id,
              sender_id: currentProfile.id,
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
    if (!currentProfile || !selectedConv) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: currentProfile.id,
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

  return (
    <div className={styles.layout}>
      {/* Conversations List */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>Tin nhắn</h2>
        </div>

        {loading ? (
          <div className={styles.convList}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skeletonConv}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className={styles.emptyConvs}>
            <span style={{ fontSize: 40 }}>✉️</span>
            <p>Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          <div className={styles.convList}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={`${styles.convItem} ${selectedConv?.id === conv.id ? styles.activeConv : ''}`}
                onClick={() => selectConversation(conv)}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar profile={conv.other_user} size="md" isOnline={isOnline(conv.other_user?.id || '')} />
                  {(conv.unread_count ?? 0) > 0 && (
                    <div className={styles.unreadBadge}>{conv.unread_count}</div>
                  )}
                </div>
                <div className={styles.convInfo}>
                  <span className={styles.convName}>{conv.other_user?.full_name || conv.other_user?.username}</span>
                  <span className={styles.convLast}>{conv.last_message || 'Bắt đầu cuộc trò chuyện'}</span>
                </div>
                {conv.last_message_at && (
                  <span className={styles.convTime}>
                    {formatDistanceToNow(new Date(conv.last_message_at), { locale: vi })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className={styles.chatArea}>
        {!selectedConv ? (
          <div className={styles.noChat}>
            <div style={{ fontSize: 64 }}>💬</div>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Bắt đầu nhắn tin với bạn bè trên Nexora</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <Avatar profile={selectedConv.other_user} size="sm" isOnline={isOnline(selectedConv.other_user?.id || '')} />
              <div>
                <div className={styles.chatName}>{selectedConv.other_user?.full_name || selectedConv.other_user?.username}</div>
                <div className={styles.chatHandle}>
                  {isOnline(selectedConv.other_user?.id || '') ? (
                    <span style={{ color: '#10b981', fontWeight: 500 }}>Đang hoạt động</span>
                  ) : selectedConv.other_user?.last_seen ? (
                    <span>Hoạt động {formatDistanceToNow(new Date(selectedConv.other_user.last_seen), { locale: vi })} trước</span>
                  ) : (
                    <span>@{selectedConv.other_user?.username}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentProfile?.id;
                return (
                  <div key={msg.id} className={`${styles.messageRow} ${isMe ? styles.myMessage : ''}`}>
                    {!isMe && <Avatar profile={(msg as any).sender} size="xs" />}
                    <div className={styles.messageContent} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {msg.image_url && (
                        (msg.image_url.includes('.webm') || msg.image_url.includes('audio')) ? (
                          <div className={`${styles.bubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                            <audio controls src={msg.image_url} style={{ maxWidth: '100%', outline: 'none' }} />
                          </div>
                        ) : (
                          <div style={{ borderRadius: 16, overflow: 'hidden', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                            <Image src={msg.image_url} alt="Sent image" width={240} height={240} style={{ objectFit: 'contain' }} />
                          </div>
                        )
                      )}
                      
                      {msg.content && (
                        <div className={`${styles.bubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                          <p>{msg.content}</p>
                        </div>
                      )}
                      
                      <span className={styles.messageTime} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: vi })}
                        {isMe && (msg.read ? ' · Đã xem' : ' · Đã gửi')}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className={styles.inputArea}>
              {selectedImage && (
                <div className={styles.previewWrapper}>
                  <img src={URL.createObjectURL(selectedImage)} alt="Preview" className={styles.previewImage} />
                  <button type="button" className={styles.closePreview} onClick={() => setSelectedImage(null)}><X size={14} /></button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
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
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    id="message-input"
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
          </>
        )}
      </div>
    </div>
  );
}
