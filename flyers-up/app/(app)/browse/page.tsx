import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabaseServer';

export default async function BrowsePage() {
  const user = await getServerUser();
  if (!user) {
    // Skip the extra bounce back through /browse after sign-in.
    // This reduces time-to-first-browse and makes the next step obvious.
    redirect('/signin?next=/customer/categories');
  }
  // Canonical browse experience lives under /customer/categories and /services
  redirect('/customer/categories');
}






