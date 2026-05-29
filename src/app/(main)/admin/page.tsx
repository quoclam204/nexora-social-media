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
    redirect('/');
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
    { data: allUsersDates },
    { data: allPostsDates }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('posts').select('*, profile:profiles(*)').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('created_at').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('posts').select('created_at').order('created_at', { ascending: false }).limit(1000),
  ]);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(dateStr => {
    const usersOnDate = allUsersDates?.filter(u => u.created_at.startsWith(dateStr)).length || 0;
    const postsOnDate = allPostsDates?.filter(p => p.created_at.startsWith(dateStr)).length || 0;
    // Format to dd/MM
    const [year, month, day] = dateStr.split('-');
    return {
      date: `${day}/${month}`,
      users: usersOnDate,
      posts: postsOnDate,
    };
  });

  return (
    <AdminClient
      stats={{ usersCount: usersCount ?? 0, postsCount: postsCount ?? 0, reportsCount: reportsCount ?? 0 }}
      recentPosts={recentPosts ?? []}
      recentUsers={recentUsers ?? []}
      chartData={chartData}
    />
  );
}

