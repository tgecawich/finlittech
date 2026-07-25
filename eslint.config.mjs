import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // The branded-type rule. `Cents` exists to stop a dollar figure masquerading
  // as cents; a cast defeats it silently. The one legitimate assertion lives in
  // lib/finance/types.ts and is exempted below.
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: 'TSAsExpression[typeAnnotation.typeName.name="Cents"]',
          message:
            "Do not cast to Cents. Construct it through toCents() or centsFromInteger(), which validate. If you want a cast here, the function signature is wrong.",
        },
      ],
    },
  },
  {
    files: ["lib/finance/types.ts"],
    rules: {
      // The single, deliberate brand-application point.
      "no-restricted-syntax": "off",
    },
  },

  // The boundary rule: lib/ must be liftable into a plain Node script.
  {
    files: ["lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*"],
              message:
                "lib/ is framework-free. If this needs React or Next, it belongs in components/ or app/.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated.
    "coverage/**",
  ]),
]);

export default eslintConfig;
