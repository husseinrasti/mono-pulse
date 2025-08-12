// @ts-check
import prettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import";
import pluginUnused from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
  // Global ignores to avoid linting build output and coverage reports
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      import: pluginImport,
      "unused-imports": pluginUnused,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  // Ensure TypeScript-only rules do not apply to plain JS files
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Keep quality high but don't block commits early on
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  prettier,
];
