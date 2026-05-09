import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import FeedClient from './FeedClient';

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Your personalized Nexora feed',
};

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  return <FeedClient currentProfile={profile} />;
}
