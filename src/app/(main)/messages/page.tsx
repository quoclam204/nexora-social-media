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

const EMOJI_QUICK = ['😊', '😂', '❤️', '🔥', '👍', '😭', '🥺', '✨', '🎉', '💯'];

export default function MessagesPage() {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                    <div className={`${styles.bubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                      {msg.image_url && (
                        <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden' }}>
                          <Image src={msg.image_url} alt="Sent image" width={240} height={240} style={{ objectFit: 'contain' }} />
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      <span className={styles.messageTime}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: vi })}
                        {isMe && (msg.read ? ' · Đã xem' : ' · Đã gửi')}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {selectedImage && (
              <div style={{ padding: '0 var(--space-4)', position: 'relative' }}>
                <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                  <Image src={URL.createObjectURL(selectedImage)} alt="Preview" fill style={{ objectFit: 'cover' }} />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', width: 20, height: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                  >×</button>
                </div>
              </div>
            )}

            {/* Emoji picker */}
            {showEmoji && (
              <div style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, overflowX: 'auto' }}>
                {EMOJI_QUICK.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { setNewMessage(prev => prev + emoji); setShowEmoji(false); }}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className={styles.inputArea}>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => fileInputRef.current?.click()}
                title="Gửi ảnh"
              >
                🖼️
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowEmoji(!showEmoji)}
                title="Emoji"
              >
                😊
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <input
                type="text"
                className={styles.messageInput}
                placeholder="Nhập tin nhắn..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                id="message-input"
              />
              <button
                id="btn-send-message"
                type="submit"
                className="btn btn-primary"
                disabled={sending || (!newMessage.trim() && !selectedImage)}
              >
                {sending ? '...' : '➤'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
