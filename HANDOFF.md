# Handoff Document — EduPlateforme

> Comprehensive technical handoff document intended for any developer or AI agent taking over the project.
> Last updated: 2026-08-30

---

## 1. Global Objective and Current Status

### Objective
EduPlateforme is a multi-tenant educational platform designed for high schools and higher education institutions in France. It operates with two primary roles: Professor and Student. Each professor acts as an isolated tenant managing their own groups, chapters, students, and documents. Students interact with a Retrieval-Augmented Generation (RAG) AI chatbot that relies exclusively on the course documents uploaded by their professor.

### Overall Progress: ~80%

| Phase | Status |
|:---|:---|
| Project initialization and dependencies | Completed |
| Prisma database schema (13 models) | Completed |
| Complete RAG pipeline (embeddings, chunker, search, prompts) | Completed |
| NextAuth authentication and middleware | Completed (middleware deprecated, see Section 7) |
| CSS design system and UI components | Completed |
| Professor and student layouts | Completed |
| All professor pages (dashboard, groups, group details, students, schedule, quotas, onboarding) | Completed |
| All student pages (dashboard, courses, schedule, announcements, chat) | Completed |
| All API routes (19 endpoints) | Completed |
| Chat interface (client component) | Completed |
| Chat API (RAG, LLM, quotas) | Completed |
| Demo data seed | Completed |
| Prisma migration and database setup | Not done (requires PostgreSQL and pgvector) |
| Successful build | Fails (2 identified issues, see Section 7) |
| Tests | No tests written |
| README | Completed |

---

## 2. Architecture

### Technical Stack

| Layer | Technology | Version |
|:---|:---|:---|
| Framework | Next.js (App Router) | 16.3.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 (via `@import "tailwindcss"`) | ^4 |
| ORM | Prisma | 6.19.3 |
| Auth | NextAuth (next-auth) | 5.0.0-beta.32 |
| Database | PostgreSQL + pgvector | — |
| LLM | Claude (Anthropic SDK, model `claude-sonnet-4-20250514`) | ^0.122.0 |
| Embeddings | Voyage AI (`voyage-3-lite`, 512 dimensions) | Direct REST API |
| Document Extraction | pdf-parse v2, mammoth | ^2.4.5, ^1.12.2 |
| Runtime | Node.js | v23.4.0 |

### Folder Structure

```
projet_cours/
├── prisma/
│   ├── schema.prisma          # 13 models, enums, pgvector
│   └── seed.ts                # Demo data (1 professor, 4 students, 2 groups)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Inter + JetBrains Mono via next/font)
│   │   ├── page.tsx           # Redirects to /login or /prof|eleve/dashboard
│   │   ├── globals.css        # Complete design system (palette, animations, cards)
│   │   ├── login/page.tsx     # Split-screen login
│   │   ├── register/page.tsx  # Professor registration
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   │   └── register/route.ts       # Professor registration API
│   │   │   ├── chat/route.ts               # RAG Chat (core feature)
│   │   │   ├── documents/
│   │   │   │   ├── upload/route.ts         # Upload and fire-and-forget processing
│   │   │   │   └── process/route.ts        # Trigger extraction/chunking/embedding
│   │   │   ├── export/route.ts             # GDPR student data export (JSON)
│   │   │   └── prof/
│   │   │       ├── groupes/route.ts
│   │   │       ├── eleves/route.ts
│   │   │       ├── eleves/[eleveId]/reset-password/route.ts
│   │   │       ├── eleves/[eleveId]/toggle/route.ts
│   │   │       ├── chapitres/route.ts
│   │   │       ├── annonces/route.ts
│   │   │       ├── cours/route.ts
│   │   │       ├── memberships/route.ts
│   │   │       ├── memberships/[membershipId]/route.ts
│   │   │       ├── dates-ds/route.ts
│   │   │       ├── quotas/route.ts
│   │   │       └── rentree/route.ts
│   │   ├── prof/
│   │   │   ├── layout.tsx              # Dark sidebar layout
│   │   │   ├── dashboard/page.tsx      # Stats, groups, upcoming classes
│   │   │   ├── groupes/page.tsx        # Group list and creation
│   │   │   ├── groupes/[groupeId]/page.tsx  # Group details (5 tabs)
│   │   │   ├── eleves/page.tsx         # Student management
│   │   │   ├── edt/page.tsx            # Aggregated schedule
│   │   │   ├── quotas/page.tsx         # AI quotas dashboard
│   │   │   └── rentree/page.tsx        # New school year transition wizard
│   │   └── eleve/
│   │       ├── layout.tsx              # Header and mobile bottom nav layout
│   │       ├── dashboard/page.tsx      # Student home
│   │       ├── cours/page.tsx          # Documents by chapter
│   │       ├── edt/page.tsx            # Student schedule
│   │       ├── annonces/page.tsx       # Announcements
│   │       └── chat/page.tsx           # Chat page (server) mapping to ChatInterface (client)
│   ├── components/
│   │   ├── ui/                         # Generic components
│   │   │   ├── button.tsx              # 5 variants, loading state
│   │   │   ├── input.tsx               # Input and Textarea, label/error
│   │   │   ├── badge.tsx               # Badge and StatusBadge
│   │   │   └── modal.tsx               # Animated modal
│   │   ├── layout/
│   │   │   ├── prof-sidebar.tsx        # Dark gradient responsive sidebar
│   │   │   └── eleve-header.tsx        # Header and mobile bottom nav
│   │   ├── chat/
│   │   │   └── chat-interface.tsx      # Complete chat interface
│   │   └── prof/
│   │       ├── groupes-list.tsx        # Group list with search/filter
│   │       ├── groupe-detail.tsx       # 5 tabs, upload, CRUD modals
│   │       ├── eleves-list.tsx         # Student table, password reset, toggle
│   │       ├── quotas-manager.tsx      # Quota management per student
│   │       └── rentree-wizard.tsx      # 2-step wizard
│   ├── lib/
│   │   ├── auth.config.ts             # NextAuth configuration (JWT, callbacks, credentials)
│   │   ├── auth.ts                     # NextAuth entry point
│   │   ├── db.ts                       # Prisma client singleton
│   │   ├── utils.ts                    # cn(), formatDate(), countWords(), getInitials()
│   │   ├── utils/
│   │   │   ├── tenant.ts              # Tenant isolation helpers
│   │   │   └── quota.ts               # Chat quota logic
│   │   ├── ai/
│   │   │   ├── embeddings.ts          # Voyage AI client (batch, query)
│   │   │   ├── llm.ts                 # Claude client (stream and sync)
│   │   │   ├── chunker.ts             # Structure-aware chunking with page detection
│   │   │   ├── rag.ts                 # pgvector vector search and context
│   │   │   └── prompts.ts             # System prompts for Explain/Revise modes
│   │   ├── documents/
│   │   │   ├── extract.ts             # Document extraction (pdf-parse v2, DOCX, TXT, MD)
│   │   │   └── process.ts             # Complete pipeline: extract, chunk, embed, store
│   │   └── storage/
│   │       ├── interface.ts            # StorageProvider abstraction
│   │       ├── local.ts               # Local filesystem storage
│   │       └── s3.ts                   # S3 stub (to be implemented in production)
│   └── middleware.ts                   # Deprecated in Next.js 16 (see Section 7)
├── .env.example                        # Complete configuration template
├── next.config.ts                      # Empty configuration
├── package.json                        # Scripts and seed configuration
└── tsconfig.json                       # Standard TypeScript configuration
```

### Key Files (by importance)

| File | Critical Role |
|:---|:---|
| `prisma/schema.prisma` | Defines the entire data structure. Includes 13 models. The `embedding` field uses `Unsupported("vector(512)")` because Prisma does not natively support pgvector. |
| `src/lib/ai/prompts.ts` | The chatbot system prompts. Contains all pedagogical instructions (source citation, course/addition distinction, adaptive difficulty, blockage detection). This governs the AI's behavior. |
| `src/lib/ai/rag.ts` | Raw SQL `$queryRawUnsafe` queries for pgvector vector search (cosine similarity). |
| `src/lib/documents/process.ts` | The extract-to-store pipeline. Utilizes raw SQL queries to insert embeddings. |
| `src/app/api/chat/route.ts` | Orchestrates the chat functionality: quota validation, RAG search, prompt construction, LLM execution, difficulty marker parsing, and message persistence. |
| `src/lib/auth.config.ts` | Complete NextAuth configuration: JWT strategy, callbacks for injecting role/tenantId into the token, and role-based route protection. |

---

## 3. Recent Work History (Chronological)

From most recent to oldest in the last session:

1. **pdf-parse v2 correction**: The import `import pdf from "pdf-parse"` was replaced by `import { PDFParse } from "pdf-parse"` and usage adjusted (`new PDFParse().parseBuffer(buffer)`) as pdf-parse v2 no longer provides a default export.
2. **Google Fonts CSS @import removal**: Removed because fonts are loaded via `next/font/google` in `layout.tsx`. The `@import url(...)` caused a CSS warning ("@import rules must precede all rules").
3. **Prisma downgrade v8 to v6**: Prisma v8 (RC) was installed by mistake. Its CLI is incompatible (`prisma generate` no longer exists in v8). Downgraded to `prisma@^6.0.0` / `@prisma/client@^6.0.0`. `npx prisma generate` functions correctly now.
4. **Creation of missing files**: Created `chat-interface.tsx`, `api/chat/route.ts`, all student pages (courses, schedule, announcements), all professor pages (students, schedule, quotas, onboarding), corresponding APIs (quotas, onboarding, toggle, export), and the seed script.
5. **Dependency installation**: All installed using `--legacy-peer-deps` (required due to peer dependency conflicts with React 19 and Next.js 16).

---

## 4. Pending Work (Unfinalized / Untested)

### Build Failures
The last execution of `npx next build` resulted in a failure with 1 blocking error remaining.

**Error 1 (BLOCKING)** — `src/lib/documents/extract.ts:1:1`:
```
Error: Export default doesn't exist in target module
> 1 | import { PDFParse } from "pdf-parse";
```
The correction was made (import changed from `pdf` to `{ PDFParse }`), but the PDFParse v2 API has not been fully verified. The build was not rerun after the correction. It is possible that `PDFParse` is not utilized exactly with `new PDFParse().parseBuffer(buffer)`. It must be verified using:
```bash
node -e "const { PDFParse } = require('pdf-parse'); const p = new PDFParse(); console.log(typeof p.parseBuffer)"
```
If `parseBuffer` does not exist, consult the pdf-parse v2 API to find the correct method.

**Warning (Non-blocking)** — Deprecated middleware:
```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```
Next.js 16 expects `proxy.ts` instead of `middleware.ts`. The middleware continues to function but is marked as deprecated. Migration can be performed with:
```bash
npx @next/codemod@canary middleware-to-proxy .
```

**Warning (Non-blocking)** — Turbopack dynamic filesystem access in `src/lib/storage/local.ts:11` (`path.resolve(UPLOAD_DIR)`). Add a `/*turbopackIgnore: true*/` comment or restructure the file.

### Unexecuted Prisma Migrations
The schema is complete, but the database has not been initialized. Steps to follow:
1. Ensure PostgreSQL is running with pgvector.
2. Configure `DATABASE_URL` in `.env`.
3. Execute `npx prisma migrate dev --name init`.
4. Add manually in the SQL migration (or via `psql`):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. After migration, create the HNSW index:
   ```sql
   CREATE INDEX idx_chunks_embedding ON document_chunks
     USING hnsw (embedding vector_cosine_ops);
   ```
6. Run `npm run db:seed` for demo data.

---

## 5. Task List (Prioritized)

### Priority 1 — Blocking Execution

- [ ] **Fix build**: Verify the `pdf-parse` v2 API in `extract.ts` and rerun `npx next build`.
- [ ] **Middleware to proxy migration**: Execute the codemod or rewrite `middleware.ts` to `proxy.ts` (Next.js 16).
- [ ] **Database setup**: Execute Prisma migration, add pgvector extension, and create the HNSW index (see Section 4).
- [ ] **Create .env**: Copy `.env.example` and populate API keys and DATABASE_URL.
- [ ] **Test seed**: Run `npm run db:seed` and verify data integrity.
- [ ] **Test login**: Verify NextAuth functionality end-to-end (professor registration and login).

### Priority 2 — Important Functionality

- [ ] **Test end-to-end RAG chat**: Upload a document, await indexing, ask a question, and verify the response with citations.
- [ ] **Verify file upload**: Test with PDF, DOCX, and TXT files.
- [ ] **Address Turbopack warning**: Add the ignore comment for `path.resolve` in `local.ts`.
- [ ] **Verify quotas**: Test quota decrementing, block logic, and bonus allocation.

### Priority 3 — Enhancements

- [ ] **Streaming chat**: The chat is currently synchronous (awaits complete response). `streamChat` exists in `llm.ts` but is unused in `api/chat/route.ts`. Implement streaming for improved user experience.
- [ ] **Pagination management**: Lists (groups, students, courses) are not paginated. This is acceptable for small volumes but scales poorly.
- [ ] **Password change mechanism**: Students currently cannot change their own passwords.
- [ ] **Unit tests**: No tests have been written.
- [ ] **S3 storage**: The `s3.ts` stub throws a "Not implemented" error.
- [ ] **Responsive testing**: Test all pages on mobile devices.

---

## 6. Significant Technical Decisions and Justifications

### Prisma v6 (Not v8)
**Decision**: Use Prisma v6.19.3, not v8.x.
**Justification**: Prisma v8 is in Release Candidate status and features a completely overhauled CLI (`prisma generate` and `prisma migrate` have been removed). The commands are replaced by `prisma orm generate`, `prisma db`, etc. There is no reliable migration guide available yet. Remaining on v6 ensures stability and proper documentation.

### pgvector via Raw SQL
**Decision**: The `vector(512)` columns are declared as `Unsupported("vector(512)")` in Prisma. All vector operations are executed via `$queryRawUnsafe` or `$executeRawUnsafe`.
**Justification**: Prisma lacks native support for the pgvector `vector` type. This is the required implementation method and cannot be replaced by standard Prisma ORM methods.

### Voyage AI for Embeddings (Not OpenAI)
**Decision**: Use Voyage AI, `voyage-3-lite` model, 512 dimensions.
**Justification**: The requirement was to centralize operations with Anthropic. Voyage AI is the embedding partner for Anthropic.

### Tenant Isolation via `tenantId`
**Decision**: Every professor has `tenantId = their own userId`. Every student has `tenantId = their professor's userId`. All queries filter by `tenantId` or `profId`.
**Justification**: Provides complete data isolation between professors. A professor cannot access another professor's data.

### Synchronous Chat API (Not Streaming)
**Decision**: The `/api/chat` route makes a synchronous call to Claude (`chat()`) and returns the complete JSON response.
**Justification**: Simpler initial implementation. Streaming is prepared in `llm.ts` (`streamChat()`) and should be migrated as a priority 3 task.

### 50-Word Limit per Message
**Decision**: Student messages are limited to 50 words, validated client-side and server-side.
**Justification**: Explicit requirement. Forces students to formulate concise questions.

### No Social Authentication
**Decision**: Authentication relies exclusively on Email and Password via NextAuth CredentialsProvider.
**Justification**: Explicit requirement. Professors provision student accounts; there is no self-registration for students.

### `--legacy-peer-deps` for npm
**Decision**: All `npm install` commands use `--legacy-peer-deps`.
**Justification**: Prevents peer dependency conflicts between React 19, Next.js 16, and various packages (such as next-auth beta). Without this flag, npm blocks the installation.

---

## 7. Known Issues and Risks

### CRITICAL

1. **pdf-parse v2 API differences**: The import was corrected, but the build has not been re-verified. The `PDFParse` class and its `parseBuffer()` method must be validated. If non-functional, options include:
   - Check exports: `node -e "console.log(Object.keys(require('pdf-parse')))"`
   - Downgrade to pdf-parse v1: `npm install pdf-parse@1.1.1`
   - Implement the v2 API correctly.
2. **middleware.ts deprecation in Next.js 16**: The build logs a warning. The file functions but Next.js expects `proxy.ts`. Apply codemod: `npx @next/codemod@canary middleware-to-proxy .`
3. **Potential SQL Injection in rag.ts**: The `chapitreIds` are injected directly into SQL via string interpolation (`'${id}'`). This is currently acceptable as IDs originate from Prisma (CUIDs), but poses a risk if user inputs are ever passed. Do not modify without proper SQL parameterization.
4. **process.ts chunk insertion via raw SQL**: Follows the same pattern. Chunk content is passed via `$1` (parameter), but other values are interpolated. Be cautious with apostrophes in section names.

### IMPORTANT

5. **`Unsupported("vector(512)")` in Prisma**: Do not remove this field or attempt to replace it with a standard type. It is intentional. The field is omitted from the generated TypeScript Prisma client; all operations require raw SQL.
6. **Prisma migrations omit pgvector extension creation**: You must manually append `CREATE EXTENSION IF NOT EXISTS vector;` to the SQL migration or execute it prior.
7. **HNSW index requirement**: Without `CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);`, vector searches default to a sequential scan, impacting performance heavily as chunk volume scales.
8. **Local storage URL format**: The `document.storageUrl` in local mode prepends `/uploads/...`. The logic in `process.ts` executes `doc.storageUrl.replace(/^\/uploads\//, "")` to retrieve the relative path. Do not alter the storageUrl format without updating this corresponding code.
9. **Node.js v23.4.0**: This is a non-LTS version. Certain packages may trigger `EBADENGINE` warnings. The application functions, but migrating to Node 22 LTS is recommended.

### MINOR

10. **CSS font-family discrepancy**: The `globals.css` file declares `--font-sans: 'Inter', system-ui, sans-serif` while next/font generates `--font-inter`. No visible bug occurs as both fonts load, but it remains internally inconsistent.

---

## 8. Useful Commands

```bash
# Development
npm run dev              # Starts the development server (port 3000)

# Build and Production
npm run build            # Production build (CURRENTLY FAILING)
npm run start            # Starts the production server (post-build)

# Database
npx prisma generate      # Regenerates the Prisma client from the schema
npx prisma migrate dev --name <name>  # Creates and applies a migration
npx prisma studio        # Web interface for database exploration
npm run db:seed          # Executes the seed (npx tsx prisma/seed.ts)

# Linting
npm run lint             # ESLint

# Debugging
npx prisma db push       # Synchronizes the schema without creating a migration (for rapid development)

# Middleware to Proxy Migration (Next.js 16)
npx @next/codemod@canary middleware-to-proxy .

# Package Export Verification
node -e "console.log(Object.keys(require('pdf-parse')))"
```

---

## 9. Environment Variables

The `.env.example` file is located at the root. Duplicate it to `.env` and configure:

```env
# REQUIRED
DATABASE_URL="postgresql://user:pass@localhost:5432/projet_cours"
NEXTAUTH_SECRET="<long random key>"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
VOYAGE_API_KEY="pa-..."

# Optional (default values suffice in development)
STORAGE_PROVIDER="local"
UPLOAD_DIR="./public/uploads"
DEFAULT_DAILY_CHAT_QUOTA=10
RAG_SIMILARITY_THRESHOLD=0.35
RAG_TOP_K=5
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Production Only (S3)
# S3_BUCKET=""
# S3_REGION=""
# S3_ACCESS_KEY=""
# S3_SECRET_KEY=""
# S3_ENDPOINT=""
```

**For PostgreSQL with pgvector**, Docker provides the simplest development setup:
```bash
docker run -d --name projet_cours_db \
  -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin \
  -e POSTGRES_DB=projet_cours -p 5432:5432 \
  pgvector/pgvector:pg16
```
This corresponds to `DATABASE_URL="postgresql://admin:admin@localhost:5432/projet_cours"`

---

## 10. Restricted and Sensitive Files

### DO NOT MODIFY without understanding the implications

| File | Reason |
|:---|:---|
| `prisma/schema.prisma` | The entire project depends on this schema. Modifications require migration and potential adaptation of raw SQL in `rag.ts` and `process.ts`. |
| `src/lib/ai/prompts.ts` | Pedagogical prompts validated against user specifications. Imposes response structure (source citation, mini-questions, adaptive difficulty). Do not simplify. |
| `src/lib/ai/rag.ts` | Contains raw pgvector SQL. The `<=>` operator denotes cosine distance. The formula `1 - distance` yields similarity. Do not modify the SQL without testing. |
| `src/lib/documents/process.ts` | Critical pipeline: chunk insertions utilize raw SQL with positional parameters. `$1` holds the chunk content (safe from injection). Other fields are interpolated (Prisma IDs, embeddings). |
| `src/lib/auth.config.ts` | JWT callbacks that inject `role`, `tenantId`, `firstName`, and `lastName` into the token. Breaking this will break the entire application, as every page reads these fields from the token. |

### TREAT WITH CAUTION

| File | Reason |
|:---|:---|
| `src/middleware.ts` | Deprecated in Next.js 16 but functional. Requires proper migration to `proxy.ts`. |
| `src/lib/documents/extract.ts` | The pdf-parse v2 import was recently corrected but remains untested. |
| `src/lib/storage/local.ts` | Displays a Turbopack warning regarding `path.resolve`. |
| `package.json` | Do not upgrade Prisma to v8. Do not omit `--legacy-peer-deps` during installations. The `"prisma": { "seed": ... }` section is required for `prisma db seed`. |

### FREELY MODIFIABLE

| File/Directory | Notes |
|:---|:---|
| `src/components/ui/*` | Pure UI components containing no business logic. |
| `src/components/layout/*` | Sidebar and header components, purely visual. |
| `src/app/*/page.tsx` | Individual pages, open to refactoring. |
| `globals.css` | Design system, modifiable as needed. |
| `next.config.ts` | Empty, available for any configuration additions. |

---

## Demo Credentials (Seed)

| Role | Email | Password |
|:---|:---|:---|
| Professor | prof@example.com | password123 |
| Student | lucas@example.com | password123 |
| Student | emma@example.com | password123 |
| Student | noa@example.com | password123 |
| Student | lea@example.com | password123 |

---

*End of Handoff Document.*
