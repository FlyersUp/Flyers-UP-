/* eslint-disable no-console */
// Production env audit helper (no secrets printed).
//
// Usage:
//   node scripts/prod_env_audit.js
//   node scripts/prod_env_audit.js /auth

const crypto = require("crypto");

function sha12(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 12);
}

function mask(s) {
  const str = String(s);
  if (str.length <= 12) return str;
  return `${str.slice(0, 6)}…${str.slice(-4)}`;
}

async function fetchText(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { ok: res.ok, status: res.status, url, text };
}

async function main() {
  const origin = "https://www.flyersup.app";
  const path = process.argv[2] || "/";
  const targetUrl = path.startsWith("http") ? path : origin + path;
  const { text: html } = await fetchText(targetUrl);

  const re = /<script[^>]+src="([^"]+_next\/static\/[^"]+)"/g;
  const scriptSrc = [];
  for (const m of html.matchAll(re)) scriptSrc.push(m[1]);

  const uniq = [...new Set(scriptSrc)].slice(0, 20);
  const chunks = await Promise.all(
    uniq.map(async (src) => {
      const url = src.startsWith("http") ? src : origin + src;
      const { text } = await fetchText(url);
      return text;
    })
  );

  const hay = `${html}\n${chunks.join("\n")}`;

  const supabaseUrl = (hay.match(/https:\/\/[a-z0-9]+\.supabase\.co/gi) || [])[0] || null;
  const stripePk = (hay.match(/pk_(live|test)_[a-zA-Z0-9]+/g) || [])[0] || null;
  const sbPublishable = (hay.match(/sb_publishable_[a-zA-Z0-9_-]+/g) || [])[0] || null;
  const supabaseAnonJwt =
    (hay.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [])[0] || null;

  const leaks = {
    stripeSecret: /\bsk_(live|test)_[a-zA-Z0-9]+\b/.test(hay),
    stripeWebhook: /\bwhsec_[a-zA-Z0-9]+\b/.test(hay),
    serviceRoleKeyName: /\bSUPABASE_SERVICE_ROLE_KEY\b/.test(hay),
  };

  console.log(
    JSON.stringify(
      {
        origin,
        targetUrl,
        scannedScriptCount: uniq.length,
        found: {
          supabaseUrl,
          stripePublishableMode: stripePk ? (stripePk.startsWith("pk_live_") ? "live" : "test") : null,
          sbPublishable: sbPublishable ? { masked: mask(sbPublishable), sha: sha12(sbPublishable) } : null,
          supabaseAnonJwt: supabaseAnonJwt ? { sha: sha12(supabaseAnonJwt) } : null,
        },
        leaks,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("prod_env_audit FAILED:", e);
  process.exit(1);
});

