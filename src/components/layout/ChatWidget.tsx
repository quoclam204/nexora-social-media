'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Conversation, Message } from '@/types';
import { Send, X, Maximize2, Minimize2, Edit, MessageSquare, ChevronLeft, Mic, Image as ImageIcon, Smile, Sticker } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { usePresence } from '@/store/usePresence';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import styles from './ChatWidget.module.css';

interface ChatWidgetProps {
  profile: Profile | null;
}

export default function ChatWidget({ profile }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
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
    if (!profile || !selectedConv || !newMessage.trim()) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: profile.id,
      content: newMessage.trim(),
    });

    if (!error) {
      await supabase.from('conversations').update({
        last_message: newMessage.trim(),
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv.id);
      setNewMessage('');
      fetchMessages(selectedConv.id);
    }
    setSending(false);
  };

  if (!profile) return null;

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
      <div className={styles.header}>
        {selectedConv ? (
          <div className={styles.headerLeft}>
            <button className={styles.iconBtn} onClick={() => setSelectedConv(null)}>
              <ChevronLeft size={20} />
            </button>
            <Avatar profile={selectedConv.other_user} size="xs" isOnline={isOnline(selectedConv.other_user?.id || '')} />
            <div className={styles.chatTitleInfo}>
              <div className={styles.chatName}>{selectedConv.other_user?.full_name || selectedConv.other_user?.username}</div>
              <div className={styles.chatStatus}>
                {isOnline(selectedConv.other_user?.id || '') ? 'Đang hoạt động' : 
                  `Hoạt động ${selectedConv.other_user?.last_seen ? formatDistanceToNow(new Date(selectedConv.other_user.last_seen), { locale: vi }) : 'gần đây'} trước`}
              </div>
            </div>
          </div>
        ) : (
          <h3 className={styles.title}>Tin nhắn</h3>
        )}
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
          </button>
          <button className={styles.iconBtn} onClick={() => setIsOpen(false)}>
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
                          <div className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                            {msg.content}
                          </div>
                          {isLast && isMe && msg.read && <div className={styles.readStatus}>Đã xem</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form className={styles.inputArea} onSubmit={sendMessage}>
                <div className={styles.inputWrapper}>
                  <button type="button" className={styles.inputIconBtn}><Smile size={20} /></button>
                  <input 
                    type="text" 
                    className={styles.messageInput} 
                    placeholder="Nhắn tin..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <div className={styles.inputActionsRight}>
                    {newMessage.trim() ? (
                      <button type="submit" className={styles.sendBtn} disabled={sending}>
                        <Send size={18} />
                      </button>
                    ) : (
                      <>
                        <button type="button" className={styles.inputIconBtn}><Mic size={20} /></button>
                        <button type="button" className={styles.inputIconBtn}><ImageIcon size={20} /></button>
                        <button type="button" className={styles.inputIconBtn}><Sticker size={20} /></button>
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
