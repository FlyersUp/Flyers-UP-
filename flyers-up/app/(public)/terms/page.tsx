import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Terms of Service — Flyers Up',
};

export default function TermsPage() {
  redirect('/legal/terms');
}
