import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PresenceProvider from '@/components/providers/PresenceProvider';
import ChatWidget from '@/components/layout/ChatWidget';
import styles from './main.module.css';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nexora.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <PresenceProvider>
      <div className={styles.layout}>
        <Sidebar profile={profile} isAdmin={isAdmin} />
        <main className={styles.main}>
          {children}
        </main>
        <MobileNav profile={profile} isAdmin={isAdmin} />
        <ChatWidget profile={profile} />
      </div>
    </PresenceProvider>
  );
}
