# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Extranjería.ai** — an AI-powered assistant for Spanish immigration queries (NIE, TIE, visas, residency permits). It answers questions in seconds with verified, up-to-date sources (BOE, sede.gob.es, SEPE).

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Clerk v6 |
| Database | PostgreSQL + pgvector — Prisma 7 with `@prisma/adapter-pg` |
| RAG | LangChain (`RecursiveCharacterTextSplitter`, `PGVectorStore`, `OpenAIEmbeddings`) |
| LLM | GPT-4o-mini — RAG chat via LangChain `ChatOpenAI` (`@langchain/openai`), streamed to `useChat` (Vercel AI SDK v6) |
| Scraping | axios + cheerio (BOE Código de Extranjería index) |
| Payments | Stripe v17 |
| Linting | Biome (primary) + ESLint |
| Testing | Vitest |
| Package manager | pnpm 10.22.0 |

## Architecture: RAG Pipeline

```
BOE biblioteca_juridica/codigos (Código de Extranjería index)
        |
        v  src/lib/scraper/boe.ts  (axios + cheerio)
   Raw documents → PostgreSQL documents table
        |
        v  src/lib/rag/chunker.ts  (LangChain RecursiveCharacterTextSplitter)
   Chunks (9000 chars, 400 overlap) as LangChain Document[]
        |
        v  src/lib/rag/vectorstore.ts  (PGVectorStore → rag_vectors table)
   Embeddings via OpenAI text-embedding-ada-002
        |
        v  src/lib/rag/retrieval.ts  (similaritySearchWithScore, cosine)
   Top-k chunks + document metadata from PostgreSQL
        |
        v  src/app/api/chat/route.ts  (LangChain ChatOpenAI chain → AI SDK UI message stream)
   GPT-4o-mini response streamed with source-url parts
```

Key constraint: **the LLM must only answer using retrieved context** — no free generation about regulations.

## Commands

```bash
pnpm dev                # start dev server
pnpm build              # production build
pnpm test               # vitest watch
pnpm vitest run         # single test run
pnpm vitest run src/lib/rag/__tests__/chunker.test.ts  # single file
pnpm lint:biome         # check with Biome
pnpm lint:fix           # auto-fix with Biome
pnpm format             # format with Biome
pnpm db:migrate         # prisma migrate dev
pnpm db:generate        # regenerate Prisma client
pnpm ingest             # run RAG ingestion pipeline
```

## Key File Locations

- `prisma/schema.prisma` — DB models (User, Document, Chunk, Conversation, Message)
- `prisma.config.ts` — Prisma 7 config (loads `.env.local` via dotenv, url from `process.env.DATABASE_URL`)
- `src/lib/db/index.ts` — Prisma singleton using `PrismaPg` driver adapter
- `src/lib/rag/vectorstore.ts` — `PGVectorStore.initialize()` using `rag_vectors` table (LangChain-managed)
- `src/lib/rag/pipeline.ts` — ingestion: scrape → upsert document → chunk → `vectorStore.addDocuments()`
- `src/lib/rag/retrieval.ts` — `similaritySearchWithScore()` + Prisma join for document metadata
- `src/lib/rag/chain.ts` — `createChatModel()` (LangChain `ChatOpenAI`, temp 0), `buildRagChain()` (`model → StringOutputParser`), + `formatContext`/`toLangChainHistory`/`buildMessages` helpers
- `src/app/api/chat/route.ts` — plan limit check → RAG retrieval → LangChain `ChatOpenAI` chain (`buildRagChain`) streamed as `source-url` + text parts
- `src/app/api/agent/route.ts` — agentic chat (`AGENT_CHAT_ENABLED=true`); OpenAI-locked, ignores `AI_EMBEDDING_PROVIDER`; tool loop via `streamText({ tools, stopWhen: stepCountIs(5) })`
- `src/lib/agent/{providers,tools,prompt}.ts` — agent-only OpenAI factories, tool definitions (`searchExtranjeriaCorpus`, `listRecentDocumentChanges`, `fetchDocumentDetail`), system prompt + URL allow-list filter
- `src/components/chat/ChatInterface.tsx` — `useChat` with `DefaultChatTransport`
- `src/lib/plans.ts` — `PLAN_LIMITS`, `hasReachedLimit()`
- `src/lib/stripe.ts` — Stripe client + `STRIPE_PRICES` map
- `src/middleware.ts` — Clerk `clerkMiddleware`, protects `/dashboard/**`, `/api/chat/**`, `/api/checkout/**`
- `biome.json` — Biome config (recommended rules, double quotes, indent 2, line width 100)

## Prisma Notes

- Prisma 7 requires `prisma.config.ts` — the `datasource.url` is NOT in `schema.prisma`
- `Chunk.embedding` uses `Unsupported("vector(1536)")` in schema; raw SQL used for inserts
- LangChain's `rag_vectors` table is separate from the `chunks` table — it is auto-created by `PGVectorStore.initialize()`
- Always run `pnpm db:generate` after schema changes

## MVP Status

- **Phase 1 — done**: RAG pipeline, BOE scraper, chat UI with source citations, Clerk auth
- **Phase 2 — done**: Stripe (Pro €9/mo + Empresa €49/mo), usage limits, user dashboard
- **Phase 3 — pending**: Email alerts for regulatory changes, document checklists, public REST API

## Key Product Rules

- Every response must cite source + verification date
- LLM answers only from retrieved context — no free generation about regulations
- Free plan: 5 queries/month; Pro/Empresa: unlimited
- All responses carry a disclaimer: orientation only, not legal advice
