/** Client + server: optional support ticket file attachments */

export const SUPPORT_ATTACHMENT_MAX_FILES = 3;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024; // 4 MiB each

export const SUPPORT_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export function supportAttachmentExtension(file: File): string {
  const t = file.type;
  if (t === 'image/png') return '.png';
  if (t === 'image/jpeg') return '.jpg';
  if (t === 'image/webp') return '.webp';
  if (t === 'application/pdf') return '.pdf';
  return '';
}

export function validateSupportAttachmentFiles(files: File[]): string | null {
  if (files.length > SUPPORT_ATTACHMENT_MAX_FILES) {
    return `You can attach at most ${SUPPORT_ATTACHMENT_MAX_FILES} files.`;
  }
  for (const f of files) {
    if (f.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      return 'Each file must be 4 MB or smaller.';
    }
    if (!SUPPORT_ATTACHMENT_MIME_TYPES.includes(f.type as (typeof SUPPORT_ATTACHMENT_MIME_TYPES)[number])) {
      return 'Allowed types: PNG, JPEG, WebP, or PDF.';
    }
  }
  return null;
}
