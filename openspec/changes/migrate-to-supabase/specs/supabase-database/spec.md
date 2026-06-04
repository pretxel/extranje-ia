## ADDED Requirements

### Requirement: Supabase Postgres hosts application and RAG data

The system SHALL use a Supabase-managed Postgres instance as the single host for application tables (`documents`, `chunks`, `users`, `conversations`, `messages`) and the LangChain-managed `rag_vectors` table. The `vector` extension MUST be enabled on that instance before any vector data is restored or queried.

#### Scenario: Vector extension present before vector use

- **WHEN** the migrated database is first connected to
- **THEN** `SELECT * FROM pg_extension WHERE extname = 'vector'` returns one row
- **AND** `rag_vectors` exists with its `embedding` column typed `vector`

#### Scenario: All application tables present after migration

- **WHEN** migration completes
- **THEN** `documents`, `chunks`, `users`, `conversations`, `messages`, and `rag_vectors` all exist in the Supabase database with their pre-migration row counts

### Requirement: Data and vectors migrate without re-embedding

The migration SHALL transfer existing embeddings as data via `pg_dump`/restore. The system MUST NOT recompute embeddings during the host move, and the embedding model and vector dimensionality MUST be unchanged from the source database.

#### Scenario: Embeddings preserved verbatim

- **WHEN** the `rag_vectors` table is restored on Supabase
- **THEN** each row's `embedding` vector and `metadata` equal the source row's values
- **AND** no call is made to the embeddings provider during migration

#### Scenario: Dimensionality unchanged

- **WHEN** the restored `rag_vectors` is inspected
- **THEN** its vector dimensionality equals the configured embedding dimensions of the source (e.g. 1536 for `text-embedding-ada-002`)

### Requirement: Pooled and direct connection strategy

The application runtime SHALL connect through the Supabase transaction pooler (pgBouncer, port 6543) via the pooled connection URL. Prisma migrations and the ingestion pipeline SHALL connect through the direct connection URL (port 5432). Both URLs MUST be supplied as server-only environment variables.

#### Scenario: Runtime uses pooled URL

- **WHEN** the app serves a request that queries the database (e.g. RAG retrieval)
- **THEN** the connection is made using the pooled URL (port 6543)

#### Scenario: Migrations use direct URL

- **WHEN** `pnpm db:migrate` runs
- **THEN** Prisma connects using the direct URL (port 5432)
- **AND** the migration completes without a prepared-statement / pooler conflict error

#### Scenario: Credentials are server-only

- **WHEN** the client bundle is built
- **THEN** neither connection URL nor the database password appears in any `NEXT_PUBLIC_*` variable or client-shipped code

### Requirement: Retrieval parity after migration

After cutover, RAG retrieval against Supabase SHALL return results equivalent to the source database for the same query, so that no application behavior changes. Cutover MUST be gated on this verification.

#### Scenario: Equivalent top-k for a representative query

- **WHEN** `findRelevantChunks(query, 5)` runs against Supabase for a representative immigration query
- **THEN** the returned chunk IDs and their document metadata match those returned by the source database for the same query
- **AND** similarity scores match within a small floating-point tolerance

#### Scenario: Cutover gated on parity

- **WHEN** retrieval parity has not been verified
- **THEN** the application is not pointed at Supabase as its primary database

### Requirement: Safe cutover and rollback

The migration SHALL keep the source database reachable until parity is verified, and SHALL avoid data drift during cutover. Rollback MUST be possible by repointing connection URLs to the source, with no schema or behavior change to revert.

#### Scenario: No drift during cutover

- **WHEN** the final `pg_dump`/restore is taken
- **THEN** writes to the source are frozen or re-synced before traffic moves, so no rows are lost or duplicated between source and Supabase

#### Scenario: Rollback by env change

- **WHEN** a post-cutover problem requires reverting
- **THEN** repointing the pooled and direct URLs to the source database restores prior operation
- **AND** no schema migration or code change is required to roll back
