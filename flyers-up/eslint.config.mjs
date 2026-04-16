import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Customer remaining-payment UI: prefer `customerRemainingPaymentUiInputFromBookingSlice`
// (see lib/bookings/customer-remaining-payment-ui.ts). Inline object literals for JSX
// `paymentInput` are blocked by `no-restricted-syntax` below; use eslint-disable
// with a short justification only for documented exceptions.

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Repo-specific:
    "scripts/**",
  ]),
  // Repo-specific rule relaxations: keep lint useful, but shippable.
  {
    rules: {
      // Many app/API surfaces legitimately deal with untyped JSON.
      // Keep this visible but don't fail CI on it.
      "@typescript-eslint/no-explicit-any": "warn",

      // Next's default config can flag local helper components; this is not a correctness issue.
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["**/*.{tsx,jsx}"],
    ignores: [
      "**/__tests__/**",
      "**/*.test.{tsx,jsx}",
      "**/*.stories.{tsx,jsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='paymentInput'] > JSXExpressionContainer > ObjectExpression",
          message:
            "Use customerRemainingPaymentUiInputFromBookingSlice(...) from lib/bookings/customer-remaining-payment-ui for paymentInput, or add eslint-disable-next-line with a documented exception.",
        },
      ],
    },
  },
]);

export default eslintConfig;
