import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Nexora Admin Panel',
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nexora.com';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  
  // Kiểm tra email tài khoản cụ thể
  if (user.email !== ADMIN_EMAIL) {
    redirect('/feed');
  }

  // Sử dụng admin client để có quyền truy cập toàn bộ dữ liệu (bypass RLS)
  const supabaseAdmin = await createAdminClient();

  // Fetch stats
  const [
    { count: usersCount },
    { count: postsCount },
    { count: reportsCount },
    { data: recentPosts },
    { data: recentUsers },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('posts').select('*, profile:profiles(*)').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  return (
    <AdminClient
      stats={{ usersCount: usersCount ?? 0, postsCount: postsCount ?? 0, reportsCount: reportsCount ?? 0 }}
      recentPosts={recentPosts ?? []}
      recentUsers={recentUsers ?? []}
    />
  );
}

