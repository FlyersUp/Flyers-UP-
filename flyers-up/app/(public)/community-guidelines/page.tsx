import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Community Guidelines — Flyers Up',
};

export default function CommunityGuidelinesPage() {
  redirect('/legal/guidelines');
}
