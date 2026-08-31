-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROF', 'ELEVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "IndexationStatus" AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'ERROR');

-- CreateEnum
CREATE TYPE "ChatMode" AS ENUM ('EXPLIQUE', 'REVISE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "default_quota" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupes" (
    "id" TEXT NOT NULL,
    "prof_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school_year" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groupes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groupe_memberships" (
    "id" TEXT NOT NULL,
    "eleve_id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groupe_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapitres" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapitres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "chapitre_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "extracted_text" TEXT,
    "index_status" "IndexationStatus" NOT NULL DEFAULT 'PENDING',
    "index_error" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(512),
    "page" INTEGER,
    "section" TEXT,
    "chunk_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annonces" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "chapitre_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours_planifies" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cours_planifies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dates_ds" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dates_ds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_ds_chapitres" (
    "id" TEXT NOT NULL,
    "date_ds_id" TEXT NOT NULL,
    "chapitre_id" TEXT NOT NULL,

    CONSTRAINT "date_ds_chapitres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "eleve_id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "mode" "ChatMode" NOT NULL,
    "date_ds_id" TEXT,
    "chapitre_id" TEXT,
    "difficulty_level" INTEGER NOT NULL DEFAULT 2,
    "notions_to_review" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consecutive_fails" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_citations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_chats" (
    "id" TEXT NOT NULL,
    "eleve_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "chats_used" INTEGER NOT NULL DEFAULT 0,
    "chats_max" INTEGER NOT NULL,
    "bonus_chats" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quota_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "groupes_prof_id_idx" ON "groupes"("prof_id");

-- CreateIndex
CREATE UNIQUE INDEX "groupe_memberships_eleve_id_groupe_id_key" ON "groupe_memberships"("eleve_id", "groupe_id");

-- CreateIndex
CREATE INDEX "chapitres_groupe_id_idx" ON "chapitres"("groupe_id");

-- CreateIndex
CREATE INDEX "documents_chapitre_id_idx" ON "documents"("chapitre_id");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");

-- CreateIndex
CREATE INDEX "annonces_groupe_id_idx" ON "annonces"("groupe_id");

-- CreateIndex
CREATE INDEX "cours_planifies_groupe_id_idx" ON "cours_planifies"("groupe_id");

-- CreateIndex
CREATE INDEX "cours_planifies_date_time_idx" ON "cours_planifies"("date_time");

-- CreateIndex
CREATE INDEX "dates_ds_groupe_id_idx" ON "dates_ds"("groupe_id");

-- CreateIndex
CREATE UNIQUE INDEX "date_ds_chapitres_date_ds_id_chapitre_id_key" ON "date_ds_chapitres"("date_ds_id", "chapitre_id");

-- CreateIndex
CREATE INDEX "conversations_eleve_id_idx" ON "conversations"("eleve_id");

-- CreateIndex
CREATE INDEX "conversations_groupe_id_idx" ON "conversations"("groupe_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "quota_chats_eleve_id_idx" ON "quota_chats"("eleve_id");

-- CreateIndex
CREATE UNIQUE INDEX "quota_chats_eleve_id_date_key" ON "quota_chats"("eleve_id", "date");

-- AddForeignKey
ALTER TABLE "groupes" ADD CONSTRAINT "groupes_prof_id_fkey" FOREIGN KEY ("prof_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupe_memberships" ADD CONSTRAINT "groupe_memberships_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groupe_memberships" ADD CONSTRAINT "groupe_memberships_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapitres" ADD CONSTRAINT "chapitres_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonces" ADD CONSTRAINT "annonces_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonces" ADD CONSTRAINT "annonces_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_planifies" ADD CONSTRAINT "cours_planifies_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dates_ds" ADD CONSTRAINT "dates_ds_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_ds_chapitres" ADD CONSTRAINT "date_ds_chapitres_date_ds_id_fkey" FOREIGN KEY ("date_ds_id") REFERENCES "dates_ds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_ds_chapitres" ADD CONSTRAINT "date_ds_chapitres_chapitre_id_fkey" FOREIGN KEY ("chapitre_id") REFERENCES "chapitres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_date_ds_id_fkey" FOREIGN KEY ("date_ds_id") REFERENCES "dates_ds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_chats" ADD CONSTRAINT "quota_chats_eleve_id_fkey" FOREIGN KEY ("eleve_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
