import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Prisma CLI doesn't load Next.js env files automatically.
// Load .env.local first (Next.js convention), then fall back to .env.
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations must use a DIRECT (non-pooled) connection. On Supabase the
    // runtime uses the pgBouncer pooler (DATABASE_URL, port 6543) while the CLI
    // migrate engine needs the direct connection (DIRECT_URL, port 5432).
    // Falls back to DATABASE_URL when DIRECT_URL is unset (single-DB dev).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
