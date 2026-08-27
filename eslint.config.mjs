// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Root-level tooling config files (vitest.config.ts, etc.) live
        // outside tsconfig.json's "include" — give them a one-off default
        // project instead of requiring every such file to be added there.
        projectService: {
          allowDefaultProject: ["*.config.{js,mjs,cjs,ts}", "prisma/*.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // All date handling lives in src/domain/time; the lint exception for
    // that module is declared below.
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "Date",
          message:
            "Use the date helpers in src/domain/time instead of the global Date.",
        },
      ],
    },
  },
  {
    // src/domain/time is the one place allowed to touch the global Date
    // (e.g. to capture "now") — everything else, including the rest of the
    // rules engine, must receive an Instant instead of reading the clock.
    files: ["src/domain/time/**/*.ts", "prisma/**/*.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
  {
    // src/domain is PURE business logic: no I/O, no Prisma, no Nest/Express, no
    // Node builtins, and it must never reach sideways into src/repositories
    // (repositories depend on domain, never the other way around).
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@prisma/client",
                "@prisma/client/*",
                "prisma",
                ".prisma/*",
              ],
              message:
                "src/domain must not depend on Prisma — that belongs in src/repositories.",
            },
            {
              group: ["@nestjs/*", "express", "express/*"],
              message:
                "src/domain must not depend on NestJS or Express — it is pure business logic with no I/O.",
            },
            {
              group: [
                "**/repositories/**",
                "../repositories",
                "../repositories/*",
                "../../repositories",
                "../../repositories/*",
              ],
              message:
                "src/domain must not import from src/repositories — repositories depend on domain, never the other way around.",
            },
            {
              group: [
                "node:*",
                "fs",
                "fs/*",
                "path",
                "path/*",
                "crypto",
                "http",
                "http/*",
                "os",
                "os/*",
              ],
              message: "src/domain must stay pure — no Node builtins here.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
