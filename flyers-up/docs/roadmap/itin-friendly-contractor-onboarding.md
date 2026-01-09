## ITIN-friendly contractor onboarding (tax identity + payout compliance; no immigration data)

### Summary
We will expand contractor onboarding to support multiple **U.S. tax identification types** (SSN and, later, ITIN) and operational payout controls. This roadmap is strictly about **tax identity and payout compliance** using Stripe Connect and Supabase. We do **not** collect immigration status, and we do **not** use “immigrant-friendly” marketing language.

### Phase 1 (MVP / Years 0–2): SSN-only via Stripe Connect (default)
- **Default onboarding**: Stripe Connect SSN-only configuration.
- **Data minimization**: Flyers Up stores only Stripe Connect account references and onboarding state; no sensitive tax ID values stored in our DB.
- **Core compliance**: basic payouts via Stripe, standard KYC/identity checks performed by Stripe.

### Phase 2 (Years 2–5): Add tax ID type selection + W-9 + reporting + payout holds
- **Tax ID type selection**: Allow the pro to select the tax identification number they use for U.S. tax reporting.
  - Options: SSN, ITIN (feature-gated), “Contact support” for other cases.
  - Store only **type + verification status** in Flyers Up (never store SSN/ITIN values).
- **Tax forms**: Collect W‑9 (via Stripe or an approved vendor flow), track `tax_forms_status` (not started / pending / verified / rejected).
- **Reporting**: 1099‑NEC generation + delivery (workflow owned by finance/compliance; implementation may leverage Stripe, vendors, or internal tooling).
- **Risk controls**:
  - **rolling payout delay** (e.g., 7–14 days) for specific cohorts or risk states
  - **dispute holds**: automatically place payouts on hold when there is an active dispute/chargeback and release when resolved

### Phase 3 (Years 5–10): Multilingual onboarding + tax education (non-advisory) + reliability scoring
- **Multilingual onboarding** (UI only): improve completion rates and understanding.
- **Help Center tax education**:
  - Education-only (not legal/tax advice)
  - Explain W‑9 and 1099‑NEC at a high level
  - Encourage consulting a qualified tax professional
- **Reliability scoring**:
  - Based on payout history, dispute rate, and fulfillment signals
  - Explicitly **not** based on immigration status (never collected)

### Phase 4 (Years 10–20): Global tax identity abstraction
- **Tax identity abstraction layer** to support:
  - US SSN/ITIN flows (W‑9)
  - International flows where applicable (e.g., W‑8 variants)
  - Country/region-specific payout compliance via Stripe Connect or equivalent partners
- Maintain strict data minimization: store only what is needed for operational compliance and reporting, and prefer tokenized/third-party storage for sensitive values.

### Permanent guardrails (non-negotiable)
- **Never ask** for citizenship, visa status, or immigration status.
- **Never** promote off-platform cash payments or “workaround” guidance.
- **Never** use language like “no papers” or similar.
- **Never** provide legal or immigration advice; tax content is **education only** and always suggests consulting a professional.


