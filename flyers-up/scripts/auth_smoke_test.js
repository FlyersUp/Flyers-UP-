/* eslint-disable no-console */
// Quick auth/onboarding smoke checks against Supabase.
//
// Usage:
//   node scripts/auth_smoke_test.js
//
// This script will create throwaway users in Supabase Auth.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  const raw = fs.readFileSync(p, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function must(env, key) {
  if (!env[key]) throw new Error(`Missing ${key} in .env.local`);
  return env[key];
}

function randEmail(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const r = Math.random().toString(16).slice(2, 8);
  return `${prefix}.${stamp}.${r}@mailinator.com`;
}

async function main() {
  const env = readEnvLocal();
  const url = must(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const anon = must(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const service = must(env, 'SUPABASE_SERVICE_ROLE_KEY');

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Fetching a service category id...');
  const cats = await admin.from('service_categories').select('id, slug').limit(1);
  if (cats.error) throw cats.error;
  const categoryId = cats.data?.[0]?.id;
  if (!categoryId) throw new Error('No service_categories rows found');

  // ------------------------------------------------------------
  // Customer flow: create confirmed user -> sign in -> profile
  // ------------------------------------------------------------
  const customerEmail = randEmail('flyersup.customer');
  const customerPassword = 'TestPass!234';

  console.log('Creating customer user (admin.createUser)...');
  const createdCustomer = await admin.auth.admin.createUser({
    email: customerEmail,
    password: customerPassword,
    email_confirm: true,
    user_metadata: { role: 'customer' },
  });
  if (createdCustomer.error) throw createdCustomer.error;
  const customerId = createdCustomer.data.user.id;

  console.log('Signing in customer (password)...');
  const signInCustomer = await anonClient.auth.signInWithPassword({
    email: customerEmail,
    password: customerPassword,
  });
  if (signInCustomer.error) throw signInCustomer.error;
  const customerAccessToken = signInCustomer.data.session.access_token;
  if (!customerAccessToken) throw new Error('Customer session missing access_token');

  const customerAuthed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${customerAccessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Ensuring customer profile exists and is self-readable (RLS)...');
  await admin.from('profiles').upsert(
    { id: customerId, role: 'customer', first_name: 'Cust', onboarding_step: null, email: customerEmail },
    { onConflict: 'id' }
  );
  const custProfile = await customerAuthed.from('profiles').select('id, role, first_name').eq('id', customerId).single();
  if (custProfile.error) throw custProfile.error;
  if (custProfile.data.role !== 'customer') throw new Error('Customer profile role mismatch');

  console.log('Signing out customer...');
  const out = await anonClient.auth.signOut();
  if (out.error) throw out.error;

  // ------------------------------------------------------------
  // Pro flow: create confirmed user -> sign in -> profile + pro row
  // ------------------------------------------------------------
  const proEmail = randEmail('flyersup.pro');
  const proPassword = 'TestPass!234';

  console.log('Creating pro user (admin.createUser)...');
  const createdPro = await admin.auth.admin.createUser({
    email: proEmail,
    password: proPassword,
    email_confirm: true,
    user_metadata: { role: 'pro' },
  });
  if (createdPro.error) throw createdPro.error;
  const proUserId = createdPro.data.user.id;

  console.log('Creating pro profile + service_pros row (admin)...');
  const up1 = await admin.from('profiles').upsert(
    { id: proUserId, role: 'pro', first_name: 'Pro', zip_code: '10001', onboarding_step: null, email: proEmail },
    { onConflict: 'id' }
  );
  if (up1.error) throw up1.error;

  const up2 = await admin.from('service_pros').upsert(
    { user_id: proUserId, display_name: 'Pro', category_id: categoryId, service_area_zip: '10001', available: true },
    { onConflict: 'user_id' }
  );
  if (up2.error) throw up2.error;

  console.log('Signing in pro (password)...');
  const signInPro = await anonClient.auth.signInWithPassword({ email: proEmail, password: proPassword });
  if (signInPro.error) throw signInPro.error;
  const proAccessToken = signInPro.data.session.access_token;
  if (!proAccessToken) throw new Error('Pro session missing access_token');

  const proAuthed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${proAccessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Confirming pro can read own service_pros row (RLS)...');
  const proRow = await proAuthed.from('service_pros').select('user_id, display_name').eq('user_id', proUserId).single();
  if (proRow.error) throw proRow.error;

  console.log('Smoke test OK.');
  console.log(JSON.stringify({ customerEmail, proEmail }, null, 2));
}

main().catch((e) => {
  console.error('Smoke test FAILED:', e);
  process.exit(1);
});

