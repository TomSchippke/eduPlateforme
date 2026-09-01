# EduPlateforme

## Overview

EduPlateforme is a multi-tenant educational platform designed for use by professors and students. The system isolates data by professor, treating each as an independent tenant. Professors manage groups, chapters, students, and course documents. Students interact with an AI chatbot that uses Retrieval-Augmented Generation (RAG) to answer questions based exclusively on the course documents uploaded by their respective professor.

## Prerequisites

- Node.js v23.4.0 (or a compatible version).
- PostgreSQL with the `pgvector` extension installed.
- Valid API keys for Anthropic and Voyage AI.

## Installation and Setup

1. Clone the repository.
2. Install dependencies using the `--legacy-peer-deps` flag to bypass peer dependency conflicts with React 19 and Next.js 16:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Copy the `.env.example` file to `.env` and populate the required variables:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/projet_cours"
   NEXTAUTH_SECRET="your-secure-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ANTHROPIC_API_KEY="your-anthropic-key"
   VOYAGE_API_KEY="your-voyage-key"
   ```
4. Push the Prisma schema to the database:
   ```bash
   npx prisma db push
   ```
5. Execute the following SQL commands in your PostgreSQL database to enable vector operations and optimize search performance:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
   ```
6. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
7. Seed the database with the provided demo data:
   ```bash
   npm run db:seed
   ```

## Usage

Start the development server:
```bash
npm run dev
```

Access the application at `http://localhost:3000`.

### Demo Credentials

The database seed provides the following accounts for testing purposes:

- Professor: prof@example.com / password123
- Student: lucas@example.com / password123
- Student: emma@example.com / password123
- Student: noa@example.com / password123
- Student: lea@example.com / password123
