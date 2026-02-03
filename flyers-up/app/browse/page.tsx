import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabaseServer';

export default async function BrowsePage() {
  const user = await getServerUser();
  if (!user) {
    redirect('/signin?next=/browse');
  }
  // Canonical browse experience lives under /customer/categories and /services
  redirect('/customer/categories');
}






