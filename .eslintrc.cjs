/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import", "unused-imports"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  env: { node: true, es2020: true, jest: true },
  settings: { "import/resolver": { typescript: true } },
  rules: {
    "unused-imports/no-unused-imports": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "import/order": [
      "warn",
      {
        groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true }
      }
    ]
  },
  overrides: [
    {
      files: ["**/*.ts"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": "warn",
        "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }]
      }
    }
  ]
};


