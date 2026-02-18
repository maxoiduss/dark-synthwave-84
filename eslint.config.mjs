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
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    // register plugin module; require the plugin package so ESLint can resolve it
    plugins: {
      "@typescript-eslint": tsPlugin
    },

    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        { "selector": "variable", "format": ["camelCase"] },
        { "selector": "typeLike", "format": ["PascalCase"] }
      ],
      "no-throw-literal": "warn",
      "curly": "warn",
      "eqeqeq": "error",
      "semi": ["error", "always"]
    }
  }
];