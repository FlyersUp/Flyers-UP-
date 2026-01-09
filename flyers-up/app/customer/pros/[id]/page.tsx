import { redirect } from 'next/navigation';

export default async function CustomerProProfileRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/pro/${params.id}`);
}






