import { LegalPageShell } from '@/components/LegalPageShell';
import { HelpSupportContent } from '@/components/support/HelpSupportContent';

export const metadata = {
  title: 'Support — Flyers Up',
  description: 'Contact Flyers Up support, read FAQs, and find terms and privacy policies.',
};

/**
 * Public support URL for App Store / Play review and in-app policy links.
 * Same content as in-app Help & Support, without requiring sign-in.
 */
export default function PublicSupportPage() {
  return (
    <LegalPageShell backHref="/">
      <HelpSupportContent />
    </LegalPageShell>
  );
}
