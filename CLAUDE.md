# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev` — Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm start` — run built server
- MCP endpoint: `POST /api/mcp` (Streamable HTTP transport via `mcp-handler`)
- No test runner configured

## Architecture
Web-based MCP server (Next.js 15 + `mcp-handler`) deployed to Vercel serverless. Wraps db.kasb.or.kr's unofficial REST API (Korea Accounting Standards Board's standard-lookup SPA) — the site itself is a Next.js SPA so a plain page fetch only returns the title, not the body; the API endpoints it calls internally return the actual paragraph text with no auth required.

Request flow:
1. `app/api/[transport]/route.ts` — single MCP handler that registers all 6 tools.
2. `src/services/tools/*.ts` — one file per MCP tool; zod input schema + delegates to `src/services/kasb/client.ts`.
3. `src/services/kasb/client.ts` — the API wrapper (`getToc`, `getParagraphs`, `getStandardContent`, `searchCount`, `qnaSearchList`, `qnaDetail`). TypeScript port of `C:\Users\ats94\Desktop\클로드\scripts\kasb.js` (the original Node CLI script this project is based on — keep both in sync if the upstream API shape changes).
4. `src/services/kasb/catalog.ts` — static list of all 98 standards (stdNum/category/title), ported from `scripts/kasb-catalog.js`.

## KASB API notes
- `GET /api/standard-indexes/{stdNum}` — table of contents tree; leaf nodes (no children in `parentDocumentIds`) are the actual clauses.
- `GET /api/paragraphs/{stdNum}/{documentId}?searchWord=` — clause text for one leaf; `clauses[].paraContent` is HTML, stripped by `stripHtml()`.
- `GET /api/search/total/count?searchWord=` — per-standard match counts, used to pick which standard to drill into.
- `GET /api/qnas/v2?...` / `GET /api/qnas/v2/{docNumber}` — Q&A search and detail.
- stdNum convention: K-IFRS uses 1000s (1016=PP&E, 1115=revenue, 1116=leases), 일반기업회계기준 uses the chapter number directly (2=financial statement presentation, 10=PP&E).
- This is an **unofficial, unauthenticated** API reverse-engineered from network capture (2026-08-25) — it can break if the site is redesigned. If a call fails, don't fall back to guessing from training data; report that the source text couldn't be verified.

## Deliberately out of scope
Snapshot/diff (revision tracking) is **not** implemented here — `scripts/kasb.js` already has `snapshot`/`diff`/`snapshot-all`/`diff-all` commands run locally via Windows Task Scheduler twice a year (see the `project_kasb_semiannual_check` memory). A serverless deployment can't persist files reliably across invocations, so don't add that here — it would just duplicate a workflow that already exists and works.

## Conventions
- TypeScript strict, ESM, Node ≥18
- Tool inputs validated with zod
- No external API key needed — db.kasb.or.kr's API is public
