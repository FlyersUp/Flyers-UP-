import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export async function SupportTicketAttachmentsPanel({ paths }: { paths: string[] | null | undefined }) {
  const list = paths?.filter(Boolean) ?? [];
  if (list.length === 0) return null;

  const admin = createAdminSupabaseClient();
  const links = await Promise.all(
    list.map(async (path) => {
      const { data, error } = await admin.storage.from('support_attachments').createSignedUrl(path, 3600);
      return { path, url: data?.signedUrl ?? null, err: error?.message ?? null };
    })
  );

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-text mb-2">Attachments</h2>
      <p className="text-xs text-muted mb-2">Signed links expire in one hour.</p>
      <ul className="space-y-2 text-sm">
        {links.map(({ path, url, err }) => (
          <li key={path} className="flex flex-wrap items-center gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium break-all"
              >
                {path.split('/').pop() ?? path}
              </a>
            ) : (
              <span className="text-danger break-all">{err ?? 'Could not sign URL'}</span>
            )}
            <span className="text-xs text-muted font-mono break-all">{path}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
