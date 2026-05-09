import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PresenceProvider from '@/components/providers/PresenceProvider';
import styles from './main.module.css';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <PresenceProvider>
      <div className={styles.layout}>
        <Sidebar profile={profile} />
        <main className={styles.main}>
          {children}
        </main>
        <MobileNav profile={profile} />
      </div>
    </PresenceProvider>
  );
}
