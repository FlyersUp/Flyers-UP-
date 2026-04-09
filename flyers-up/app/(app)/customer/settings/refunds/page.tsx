import { redirect } from 'next/navigation';

/** Legacy URL — refunds UI lives under /customer/settings/payments/refunds */
export default function CustomerRefundsRedirectPage() {
  redirect('/customer/settings/payments/refunds');
}
