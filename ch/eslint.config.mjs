import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  files: ["src/app/**/_*.tsx", "src/app/**/*.tsx"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react-hooks/exhaustive-deps": "off"
  }
}, {
  files: ["src/pages/api/**/*.ts", "src/pages/api/**/*.tsx"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "prefer-const": "off"
  }
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];

export default eslintConfig;
