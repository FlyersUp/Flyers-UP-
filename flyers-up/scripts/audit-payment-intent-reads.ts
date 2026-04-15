/**
 * CI / local: fail on unsafe raw PaymentIntent column nullish reads in lib/ and app/.
 * Run from `flyers-up/`: `npx tsx scripts/audit-payment-intent-reads.ts`
 */
import { runPaymentIntentReadAudit } from '../lib/bookings/payment-intent-read-audit';

const root = process.cwd();
const v = runPaymentIntentReadAudit(root);
if (v.length > 0) {
  console.error(
    'payment-intent-read-audit failed:\n' + v.map((x) => `${x.file}:${x.line} [${x.column}] ${x.text}`).join('\n')
  );
  process.exit(1);
}
