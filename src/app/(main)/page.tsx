import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import FeedClient from './FeedClient';

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Your personalized Nexora feed',
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return <FeedClient currentProfile={profile} />;
}
