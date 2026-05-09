'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface FriendSuggestionsProps {
  currentProfile: Profile | null;
}

export default function FriendSuggestions({ currentProfile }: FriendSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!currentProfile) return;

    const fetchSuggestions = async () => {
      try {
        // Get people I follow
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentProfile.id);

        const followingIds = follows?.map(f => f.following_id) || [];
        followingIds.push(currentProfile.id); // exclude self

        // Get blocked users
        const { data: blocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', currentProfile.id);
        const blockedIds = blocks?.map(b => b.blocked_id) || [];
        const excludedIds = [...followingIds, ...blockedIds];

        // Get 5 random users not in excludedIds
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*')
          .not('id', 'in', `(${excludedIds.join(',')})`)
          .limit(5);

        if (!error && users) {
          setSuggestions(users);
        }
      } catch (err) {
        console.error('Error fetching suggestions', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [currentProfile, supabase]);

  const handleFollow = async (userId: string) => {
    if (!currentProfile) return;
    
    // Optimistic UI update
    setSuggestions(prev => prev.filter(u => u.id !== userId));
    
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentProfile.id, following_id: userId });
      
    if (error) {
      toast.error('Lỗi khi theo dõi người dùng');
    } else {
      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: currentProfile.id,
        type: 'follow'
      });
      toast.success('Đã theo dõi!');
    }
  };

  if (!currentProfile || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
        Gợi ý cho bạn
      </h3>
      
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {suggestions.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <Link href={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <Avatar profile={user} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.full_name || user.username}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    @{user.username}
                  </div>
                </div>
              </Link>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ padding: '6px 12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                onClick={() => handleFollow(user.id)}
              >
                Theo dõi
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
