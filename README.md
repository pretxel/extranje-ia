# Extranjería.ai

AI-powered assistant for Spanish immigration queries. Get instant, sourced answers about NIE, TIE, visas, and residency permits — backed by verified official sources from the BOE, SEPE, and Sede Electrónica.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Clerk v6 |
| Database | PostgreSQL + pgvector (Prisma 7) |
| RAG | LangChain + OpenAI `text-embedding-ada-002` |
| LLM | GPT-4o via Vercel AI SDK v6 |
| Payments | Stripe |
| Linting | Biome + ESLint |
| Testing | Vitest |

## Architecture

The core is a RAG (Retrieval-Augmented Generation) pipeline that ensures every answer is grounded in official legal sources:

```
BOE / sede.gob.es / SEPE
        |
        v  (daily cron scraper — axios + cheerio)
   Raw document stored in PostgreSQL (documents table)
        |
        v  (LangChain RecursiveCharacterTextSplitter)
   Text chunks (9000 chars, 400 overlap)
        |
        v  (OpenAI text-embedding-ada-002)
   Embeddings stored in pgvector (rag_vectors table)
        |
        v  (user sends query)
   Similarity search (cosine distance)
        |
        v  (top-k chunks injected as context)
   GPT-4o generates response
        |
        v
   Streamed response with source citations + verification dates
```

The LLM is instructed to answer **only** from retrieved context — no free generation about regulations — to prevent hallucinations.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL with the `pgvector` extension enabled

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL=

# OpenAI
OPENAI_API_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO=
STRIPE_PRICE_EMPRESA=
```

### Install & Run

```bash
pnpm install
pnpm dev
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests (watch mode) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint:biome` | Check code with Biome |
| `pnpm lint:fix` | Auto-fix Biome issues |
| `pnpm format` | Format source files with Biome |
| `pnpm ingest` | Run the RAG ingestion pipeline manually |
| `pnpm cron` | Start the scheduled scraper |

## Database Setup

```bash
# Run migrations (requires DATABASE_URL in .env.local)
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Open Prisma Studio
pnpm db:studio
```

The migration enables the `pgvector` extension and creates the `users`, `documents`, `chunks`, `conversations`, and `messages` tables. LangChain manages the `rag_vectors` table automatically on first run.

## Project Structure

```
src/
  app/
    (auth)/          # Sign-in / sign-up pages (Clerk)
    api/             # Route handlers: /chat, /checkout, /webhooks/stripe, /user
    dashboard/       # Authenticated app shell + /chat page
    page.tsx         # Public landing page
  components/
    chat/            # ChatInterface, MessageBubble, SourceCard, ChatInput, UsageBanner
  lib/
    db/              # Prisma client singleton (pg adapter)
    rag/             # Chunker, embeddings, vectorstore, retrieval, pipeline
    scraper/         # BOE scraper (Código de Extranjería index)
    stripe.ts        # Stripe client + price IDs
    plans.ts         # Plan limits and query enforcement
  scripts/
    ingest.ts        # One-shot ingestion runner
    cron.ts          # Scheduled scraper
prisma/
  schema.prisma      # Database schema
  migrations/        # SQL migration files
```

## Agent chat (experimental)

A second conversational surface, `/dashboard/agent` backed by `POST /api/agent`, runs
GPT-4o in a tool-calling loop instead of single-shot RAG. Tools available to the agent:

- `searchExtranjeriaCorpus` — wraps the existing similarity search.
- `listRecentDocumentChanges` — surfaces documents whose content changed in the last *N* days
  (powered by `Document.updatedAt` + `contentHash` from the change-tracking ingest).
- `fetchDocumentDetail` — returns full metadata for a single document for citation.

The route is OpenAI-locked and ignores `AI_EMBEDDING_PROVIDER`.

```bash
# Required env vars
AGENT_CHAT_ENABLED=true
OPENAI_API_KEY=sk-...
# Optional overrides
OPENAI_AGENT_MODEL=gpt-4o-mini
OPENAI_AGENT_EMBEDDING_MODEL=text-embedding-3-small
```

```bash
# Smoke test (replace COOKIE with a Clerk session cookie)
curl -N -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=$COOKIE" \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"¿qué documentación ha cambiado en los últimos 30 días?"}]}]}'
```

Plan limits are shared with `/api/chat`: one user turn = +1 to `queriesUsed`, regardless of
how many tool calls the agent made.

## Pricing

| Plan | Price | Queries |
|---|---|---|
| Básico | Free | 5 / month |
| Pro | €9 / month | Unlimited |
| Empresa | €49 / month | Unlimited (coming soon) |

## Legal

All responses are for informational purposes only and do not constitute legal advice. Always consult a qualified immigration lawyer for your specific situation.
