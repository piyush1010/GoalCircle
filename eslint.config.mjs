import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Browser popups can be blocked silently in in-app browsers and webviews, which makes
    // buttons look broken. Use confirmAction() from lib/confirm.ts instead.
    rules: {
      "no-restricted-properties": ["error",
        { object: "window", property: "confirm", message: "Use confirmAction() from @/lib/confirm." },
        { object: "window", property: "alert", message: "Show the message in the page instead." },
        { object: "window", property: "prompt", message: "Use an in-page input instead." },
      ],
      "no-restricted-globals": ["error",
        { name: "confirm", message: "Use confirmAction() from @/lib/confirm." },
        { name: "alert", message: "Show the message in the page instead." },
        { name: "prompt", message: "Use an in-page input instead." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "android/app/src/main/assets/public/**",
    "ios/App/App/public/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
