# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Extranjería.ai** — an AI-powered assistant for Spanish immigration queries (NIE, TIE, visas, residency permits). It answers questions in seconds with verified, up-to-date sources (BOE, sede.gob.es, SEPE). See `DEFINITION.md` for the full product spec.

## Planned Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| Backend | Node.js + TypeScript |
| Database | PostgreSQL + pgvector |
| LLM | Claude Sonnet (Anthropic API) |
| Scraping | Playwright + cron (GitHub Actions or Railway) |
| Auth | Clerk |
| Payments | Stripe |
| Deploy | Vercel (frontend) + Railway (backend/workers) |

## Architecture: RAG Knowledge Pipeline

The core of the product is a RAG pipeline:

```
BOE / sede.gob.es / SEPE
        ↓  (daily cron scraper)
   Chunking + processing
        ↓
   Embeddings (OpenAI / Cohere)
        ↓
   pgvector (PostgreSQL)
        ↓
   Retrieval → Claude Sonnet
        ↓
   Response with source citation + verification date
```

Key constraint: **the LLM must only answer using retrieved context** — no free generation about regulations to prevent hallucinations.

## MVP Phases

- **Phase 1** — RAG pipeline, scraper (BOE + sede.gob.es), chat UI with source citations, Clerk auth
- **Phase 2** — Stripe (Pro €9/mo + Empresa €49/mo), usage limits per plan, user dashboard
- **Phase 3** — Email alerts for regulatory changes, auto-generated document checklists, public REST API

## Key Product Rules

- Every response must cite source + verification date
- Alert if scraper hasn't run in >24h
- Disclaimer on all responses: orientation only, not legal advice
- Free plan: 5 queries/month; Pro: unlimited with personalization
