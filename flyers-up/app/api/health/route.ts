export const runtime = 'nodejs';

export function GET() {
  const supabaseUrlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKeySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKeySet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const stripeSecretKeySet = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookSecretSet = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const stripePublishableKeySet = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const slackWebhookSet = Boolean(process.env.SLACK_WEBHOOK_URL);

  return Response.json(
    {
      ok: true,
      env: {
        supabaseUrlSet,
        supabaseAnonKeySet,
        serviceRoleKeySet,
        stripeSecretKeySet,
        stripeWebhookSecretSet,
        stripePublishableKeySet,
        slackWebhookSet,
      },
    },
    { status: 200 }
  );
}



