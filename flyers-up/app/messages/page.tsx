import { redirect } from 'next/navigation';

export default function MessagesRedirect() {
  // Messages UI is currently implemented under /customer/chat and /pro/chat
  redirect('/customer');
}





