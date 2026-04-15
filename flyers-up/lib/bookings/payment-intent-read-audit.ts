/**
 * Static audit: discourage unsafe nullish-coalescing on raw final/remaining PI columns in money paths.
 *
 * **Intentional exceptions** (do not “fix” away without updating this list and product intent):
 * - **Legacy full-payment route** (`app/api/bookings/[bookingId]/pay/route.ts`): single PI in `payment_intent_id`.
 * - **Deposit provisioning** (`pay/deposit`, lifecycle writes): `payment_intent_id` / deposit columns as write targets.
 * - **Raw admin inspection JSON** (`admin/.../payments` audit section): surfaces DB columns for support.
 * - **Coalescing implementation** (`lib/bookings/money-state.ts`): only place that may combine raw columns.
 * - **PostgREST `.or()` / `.eq()` filter strings** listing column names (no `??` coalesce reads).
 * - **Tests** under `__tests__`.
 *
 * Prefer {@link getBookingFinalPaymentIntentIdOrNull} / {@link getBookingDepositPaymentIntentIdOrNull} for reads.
 *
 * Escape hatch for rare one-off lines: end-of-line comment `AUDIT_OK_PAYMENT_INTENT_READ`.
 */

import { readdirSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';

export type PaymentIntentReadAuditViolation = {
  file: string;
  line: number;
  column: string;
  text: string;
};

const SCAN_SUBDIRS = ['lib', 'app'] as const;

const PATTERNS: readonly {
  id: string;
  re: RegExp;
  /** If the trimmed line includes any of these substrings, skip (safe helper / comment / implementation detail). */
  allowLineSubstrings: readonly string[];
}[] = [
  {
    id: 'final_payment_intent_id ??',
    re: /\bfinal_payment_intent_id\s*\?\?/,
    allowLineSubstrings: [
      'pickNonEmptyPaymentIntentId',
      'getBookingFinalPaymentIntentIdOrNull',
      'coalesceBookingFinalPaymentIntentId',
      'AUDIT_OK_PAYMENT_INTENT_READ',
    ],
  },
  {
    id: 'stripe_payment_intent_remaining_id ??',
    re: /\bstripe_payment_intent_remaining_id\s*\?\?/,
    allowLineSubstrings: [
      'pickNonEmptyPaymentIntentId',
      'getBookingFinalPaymentIntentIdOrNull',
      'coalesceBookingFinalPaymentIntentId',
      'AUDIT_OK_PAYMENT_INTENT_READ',
    ],
  },
  {
    id: 'deposit_payment_intent_id ??',
    re: /\bdeposit_payment_intent_id\s*\?\?/,
    allowLineSubstrings: [
      'pickNonEmptyPaymentIntentId',
      'getBookingDepositPaymentIntentIdOrNull',
      'coalesceBookingDepositPaymentIntentId',
      'AUDIT_OK_PAYMENT_INTENT_READ',
    ],
  },
  {
    id: 'stripe_payment_intent_deposit_id ??',
    re: /\bstripe_payment_intent_deposit_id\s*\?\?/,
    allowLineSubstrings: [
      'pickNonEmptyPaymentIntentId',
      'getBookingDepositPaymentIntentIdOrNull',
      'coalesceBookingDepositPaymentIntentId',
      'AUDIT_OK_PAYMENT_INTENT_READ',
    ],
  },
];

/** Relative POSIX paths (from repo root) excluded entirely. */
const EXCLUDED_REL_PATH_PREFIXES: readonly string[] = [
  'lib/bookings/money-state.ts',
  'lib/bookings/payment-intent-read-audit.ts',
];

function toPosix(rel: string): string {
  return rel.split(sep).join('/');
}

function isExcluded(relPosix: string): boolean {
  if (relPosix.includes('/__tests__/')) return true;
  return EXCLUDED_REL_PATH_PREFIXES.some((p) => relPosix === p || relPosix.startsWith(p));
}

function walkFiles(root: string, dir: string, acc: string[]): void {
  let entries: import('fs').Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as import('fs').Dirent[];
  } catch {
    return;
  }
  for (const e of entries) {
    const name = String(e.name);
    if (name.startsWith('.') && name !== '.') continue;
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (e.isDirectory()) walkFiles(root, p, acc);
    else if (e.isFile() && (name.endsWith('.ts') || name.endsWith('.tsx'))) acc.push(p);
  }
}

/**
 * Returns violations for patterns that usually indicate an unsafe “pick first column” read.
 * Run from repo root (`flyers-up/`).
 */
export function runPaymentIntentReadAudit(repoRoot: string): PaymentIntentReadAuditViolation[] {
  const violations: PaymentIntentReadAuditViolation[] = [];
  const files: string[] = [];
  for (const sub of SCAN_SUBDIRS) {
    walkFiles(repoRoot, join(repoRoot, sub), files);
  }

  for (const abs of files) {
    const rel = toPosix(relative(repoRoot, abs));
    if (isExcluded(rel)) continue;

    let content: string;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.length === 0) return;

      for (const pat of PATTERNS) {
        if (!pat.re.test(line)) continue;
        if (pat.allowLineSubstrings.some((s) => line.includes(s))) continue;
        violations.push({
          file: rel,
          line: i + 1,
          column: pat.id,
          text: trimmed.slice(0, 200),
        });
      }
    });
  }

  return violations;
}
