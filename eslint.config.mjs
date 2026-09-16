import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";

/*
 * Modül sınırları (02-mimari.md Bölüm 3.4):
 * - feature (src/features/<m>/**)         : başka modüle sadece index üzerinden erişir
 * - feature-index (src/features/<m>/index.ts)
 * - registry (src/modules/registry.ts, widgets.ts): features'a bakan tek shared yer
 * - modules (src/modules/** diğer)         : features'a bakamaz
 * - shared (lib, components, types, content, config): features'a bakamaz
 * - app (src/app/**)                       : feature-index + registry + shared
 */
const FEATURE_DEEP_IMPORT_MESSAGE =
  "@/features/<modül> yalnızca index üzerinden import edilir (02-mimari 3.4).";

const sameModule = {
  to: { element: { type: "feature", captured: { module: "{{from.element.captured.module}}" } } },
};
const toIndex = { to: { file: { categories: "feature-index" } } };
const toElements = (...types) => ({ to: { element: { types: { anyOf: types } } } });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    "playwright-report/**",
    "test-results/**",
    "supabase/**",
    "src/types/database.types.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/ignore": ["src/**/*.test.{ts,tsx}"],
      "boundaries/elements": [
        { type: "feature", pattern: "src/features/*", capture: ["module"] },
        { type: "modules", pattern: "src/modules" },
        { type: "shared", pattern: "src/(lib|components|types|content|config)" },
        { type: "app", pattern: "src/app" },
      ],
      "boundaries/files": [
        { category: "feature-index", pattern: "src/features/*/index.ts" },
        { category: "registry", pattern: "src/modules/(registry|widgets).ts" },
      ],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            // Modül: kendi içi + başka modüllerin index'i + shared/modules.
            {
              from: { element: { type: "feature" } },
              allow: [sameModule, toIndex, toElements("shared", "modules")],
            },
            // Shared katmanlar features'a bakamaz.
            {
              from: { element: { types: { anyOf: ["shared", "modules"] } } },
              allow: toElements("shared", "modules"),
            },
            // registry.ts / widgets.ts: sadece feature index'leri (+ shared/modules).
            {
              from: { file: { categories: "registry" } },
              allow: [toIndex, toElements("shared", "modules")],
            },
            // app: feature index'leri + registry + shared.
            {
              from: { element: { type: "app" } },
              allow: [toIndex, toElements("modules", "shared", "app")],
            },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ regex: "^@/features/[^/]+/.+", message: FEATURE_DEEP_IMPORT_MESSAGE }],
        },
      ],
    },
  },
  {
    // Manifest yalnızca metadata: React ve bileşen import etmez (02-mimari 3.4 madde 4).
    files: ["src/features/*/module.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message: "module.ts sadece metadata içerir; bileşenler widgets.ts'de.",
            },
            {
              name: "react-dom",
              message: "module.ts sadece metadata içerir; bileşenler widgets.ts'de.",
            },
          ],
          patterns: [
            { regex: "^@/features/[^/]+/.+", message: FEATURE_DEEP_IMPORT_MESSAGE },
            {
              regex: "^(@/components/|\\./components/|\\.\\./components/|\\./widgets)",
              message:
                "module.ts bileşen import edemez; panel kartları widgets.ts içinde tanımlanır.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
