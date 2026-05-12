# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server (defaults to :3000, falls back to :3001)
npm run build        # production build
npm run test         # run vitest unit tests (fast, node env)
npm run test:watch   # watch mode for tests
npx tsc --noEmit     # type-check without emitting
```

Run a single test file:
```bash
npx vitest run lib/calculations.test.ts
```

**Do not run `npm run build` while `npm run dev` is active.** The two share `.next/static/css/` and a production build leaves hashed CSS files that dev mode refuses to overwrite — the page then loads with no styles. Fix: stop dev, `rm -rf .next`, restart dev.

## Environment

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. Without it the `/api/playbook` route returns the static mock from `lib/mock-playbook.ts` instead of calling Gemini. The model defaults to `gemini-2.5-flash` but can be overridden via `GEMINI_MODEL`.

## Architecture

The app is a single-page calculator. State flows in one direction: `CalculatorInputs` → `computeProjection()` → render. No server state, no database.

**Math layer (`lib/calculations.ts`)** — pure functions, no React, no I/O. All four ROI scenarios, daily burndown array, break-even, NPV, and per-scenario results live here. This is the only file with unit tests; keep it that way.

**Four scenarios** (all togglable independently):
- `replace` — salary saved by AI taking over a role (with linear ramp-up)
- `augment` — % of manual work freed across a team (with linear ramp-up)
- `avoidHire` — step function that activates at `avoidedHireMonth × 30` days
- `errorReduction` — annual error cost × reduction % ÷ 365 (with linear ramp-up)

`computeProjection(inputs)` returns `{ daily: DailyPoint[], perScenario, summary }`. The `daily` array drives the Recharts burndown chart; `summary` drives the four stat cards. `useMemo` in `page.tsx` recomputes on every input change (cheap — ~720 entries for a 24-month horizon).

**AI build cost** is treated as a day-1 lump-sum capex in the cumulative AI cost line; recurring run cost accrues daily.

**LLM playbook (`app/api/playbook/route.ts`)** — POST-only server route. Receives `{ inputs, summary }`, calls `buildPlaybookPrompt()`, sends to Gemini with `responseMimeType: "application/json"` and a response schema, validates with `PlaybookSchema` (zod). Returns `{ playbook, source: "llm" | "mock" }`. `?mock=1` query param or missing API key bypasses Gemini entirely.

**Types** — `types/inputs.ts` owns `CalculatorInputs` and `DEFAULT_INPUTS`. `types/results.ts` owns `DailyPoint`, `ScenarioResult`, `Projection`. `types/playbook.ts` owns the zod schemas; everything else infers from them.

**Path alias** — `@/` maps to the repo root (configured in both `tsconfig.json` and `vitest.config.ts`).

**Styling** — Tailwind with CSS custom properties for theming. Colors (`--chart-employee`, `--chart-ai`, `--chart-savings`) are defined in `globals.css` and consumed directly in Recharts via `hsl(var(...))`. Utility classes `input-base`, `btn-primary`, `btn-ghost`, `card-base`, `stat-value`, `stat-label` are defined in `globals.css` `@layer components` to avoid repetition.
