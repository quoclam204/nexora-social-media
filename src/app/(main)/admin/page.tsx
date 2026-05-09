import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Nexora Admin Panel',
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch stats
  const [
    { count: usersCount },
    { count: postsCount },
    { count: reportsCount },
    { data: recentPosts },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('posts').select('*, profile:profiles(*)').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  return (
    <AdminClient
      stats={{ usersCount: usersCount ?? 0, postsCount: postsCount ?? 0, reportsCount: reportsCount ?? 0 }}
      recentPosts={recentPosts ?? []}
      recentUsers={recentUsers ?? []}
    />
  );
}
