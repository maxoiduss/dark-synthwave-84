/* eslint-disable @typescript-eslint/naming-convention */
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
        "out",
        "dist",
        "**/*.d.ts"
    ]
  },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 6,
        sourceType: "module"
      }
    },
    // register plugin module; require the plugin package so ESLint can resolve it
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    
    rules: {
      "@typescript-eslint/naming-convention": "warn",
      "curly": "warn",
      "eqeqeq": "warn",
      "no-throw-literal": "warn",
      "semi": "warn"
    }
  }
];