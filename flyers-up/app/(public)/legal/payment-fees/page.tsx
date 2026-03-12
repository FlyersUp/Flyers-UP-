import { redirect } from 'next/navigation';

export default function PaymentFeesRedirect() {
  redirect('/legal/payments');
}
