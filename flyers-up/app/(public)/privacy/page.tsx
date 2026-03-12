import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Privacy Policy — Flyers Up',
};

export default function PrivacyPage() {
  redirect('/legal/privacy');
}
