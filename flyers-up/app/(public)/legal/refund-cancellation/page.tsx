import { redirect } from 'next/navigation';

export default function RefundCancellationRedirect() {
  redirect('/legal/refunds');
}
