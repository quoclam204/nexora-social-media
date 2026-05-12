'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nexora.com';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }
  return true;
}

export async function deletePostAction(postId: string) {
  try {
    await checkAdmin();
    const supabaseAdmin = await createAdminClient();
    
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', postId);
    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    await checkAdmin();
    const supabaseAdmin = await createAdminClient();
    
    // Note: Deleting from profiles will cascade delete posts/comments etc based on schema
    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
