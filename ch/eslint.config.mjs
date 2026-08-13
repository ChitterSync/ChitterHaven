import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off"
  }
}, {
  files: ["src/app/**/_*.tsx", "src/app/**/*.tsx"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react-hooks/exhaustive-deps": "off"
  }
}, {
  files: ["**/*.js"],
  rules: {
    "@typescript-eslint/no-require-imports": "off"
  }
}, {
  files: ["src/pages/api/**/*.ts", "src/pages/api/**/*.tsx"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "prefer-const": "off"
  }
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "ChatDemo.js", "Main.js", "chTokens.js"]
}];

export default eslintConfig;
