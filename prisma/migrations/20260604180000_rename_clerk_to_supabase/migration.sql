-- Clerk → Supabase Auth (P3): rename users.clerk_id to users.supabase_id
ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "supabase_id";
ALTER INDEX "users_clerk_id_key" RENAME TO "users_supabase_id_key";
