import { redirect } from 'next/navigation';

/** Legacy URL — wallet UI lives under /customer/settings/payments/methods */
export default function CustomerPaymentMethodsRedirectPage() {
  redirect('/customer/settings/payments/methods');
}
