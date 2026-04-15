/**
 * Repo guardrail: Stripe refund/transfer call sites must use canonical metadata builders.
 *
 * Run: npx tsx --test lib/stripe/__tests__/metadata-guardrail.test.ts
 *
 * Intentionally simple string scans (no AST). Skips tests, server gateway, and this file.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.git']);

function shouldSkipFile(absPath: string): boolean {
  const rel = relative(PROJECT_ROOT, absPath);
  if (rel.includes(`__tests__${sep}`) || rel.includes(`${sep}__tests__${sep}`)) return true;
  if (/\.(test|spec)\.(t|j)sx?$/.test(rel)) return true;
  if (rel.endsWith(`server.ts`) || rel.endsWith(`metadata-guardrail.test.ts`)) return true;
  if (rel.includes(`${sep}scripts${sep}`)) return true;
  return false;
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walkTsFiles(p));
    else if (/\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function collectSources(): string[] {
  const roots = ['lib', 'app'].map((d) => join(PROJECT_ROOT, d));
  const files: string[] = [];
  for (const r of roots) {
    try {
      statSync(r);
    } catch {
      continue;
    }
    files.push(...walkTsFiles(r));
  }
  return files.filter((f) => !shouldSkipFile(f));
}

test('refund Stripe calls must import refundLifecycleMetadata', () => {
  const violations: string[] = [];
  for (const abs of collectSources()) {
    const text = readFileSync(abs, 'utf8');
    if (!/refundPaymentIntent\s*\(/.test(text) && !/refundPaymentIntentPartial\s*\(/.test(text)) continue;
    if (!text.includes('refundLifecycleMetadata')) {
      violations.push(relative(PROJECT_ROOT, abs));
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Files call refundPaymentIntent* but do not reference refundLifecycleMetadata:\n${violations.join('\n')}`
  );
});

test('createTransfer usage must import transferLifecycleStripeMetadata', () => {
  const violations: string[] = [];
  for (const abs of collectSources()) {
    const text = readFileSync(abs, 'utf8');
    if (!/createTransfer\s*\(/.test(text)) continue;
    if (!text.includes('transferLifecycleStripeMetadata')) {
      violations.push(relative(PROJECT_ROOT, abs));
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Files call createTransfer but do not reference transferLifecycleStripeMetadata:\n${violations.join('\n')}`
  );
});

test('refundPaymentIntent must not receive empty metadata object as second argument', () => {
  const violations: string[] = [];
  const re = /refundPaymentIntent\s*\(\s*[^,]+,\s*\{\s*\}\s*\)/gs;
  for (const abs of collectSources()) {
    const text = readFileSync(abs, 'utf8');
    if (re.test(text)) {
      violations.push(relative(PROJECT_ROOT, abs));
    }
  }
  assert.deepEqual(violations, [], `Empty refund metadata: ${violations.join(', ')}`);
});
