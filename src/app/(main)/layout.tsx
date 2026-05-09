import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import RightSidebar from '@/components/layout/RightSidebar';
import PresenceProvider from '@/components/providers/PresenceProvider';
import styles from './main.module.css';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <PresenceProvider>
      <div className={styles.layout}>
        <Sidebar profile={profile} />
        <main className={styles.main}>
          {children}
        </main>
        <RightSidebar />
        <MobileNav profile={profile} />
      </div>
    </PresenceProvider>
  );
}
