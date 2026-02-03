import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
]);

export default eslintConfig;
