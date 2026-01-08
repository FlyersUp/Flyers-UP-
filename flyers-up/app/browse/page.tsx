import { redirect } from 'next/navigation';

export default function BrowsePage() {
  // Canonical browse experience lives under /customer/categories and /services
  redirect('/customer/categories');
}





