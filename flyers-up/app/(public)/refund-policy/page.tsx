import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Refund and Cancellation Policy — Flyers Up',
};

export default function RefundPolicyPage() {
  redirect('/legal/refunds');
}
