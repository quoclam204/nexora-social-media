'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePresence } from '@/store/usePresence';

export default function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { setOnlineUsers } = usePresence();
  
  useEffect(() => {
    const supabase = createClient();
    let presenceChannel: any;
    let interval: NodeJS.Timeout;

    const initPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update last_seen immediately
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id).then();

      // Setup interval to update last_seen every 3 minutes
      interval = setInterval(() => {
        supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id).then();
      }, 3 * 60 * 1000);

      presenceChannel = supabase.channel('online-users');

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineIds = Object.values(state).flatMap((p: any) => p.map((u: any) => u.user_id));
          setOnlineUsers(onlineIds);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });
    };

    initPresence();

    return () => {
      if (interval) clearInterval(interval);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [setOnlineUsers]);

  return <>{children}</>;
}
