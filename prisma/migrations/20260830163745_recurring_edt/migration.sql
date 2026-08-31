-- AlterTable
ALTER TABLE "cours_planifies" ADD COLUMN     "end_time" TIMESTAMP(3),
ADD COLUMN     "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_ds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_exception" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template_id" TEXT;

-- CreateTable
CREATE TABLE "school_holidays" (
    "id" TEXT NOT NULL,
    "prof_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours_templates" (
    "id" TEXT NOT NULL,
    "groupe_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cours_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_holidays_prof_id_idx" ON "school_holidays"("prof_id");

-- CreateIndex
CREATE INDEX "cours_templates_groupe_id_idx" ON "cours_templates"("groupe_id");

-- CreateIndex
CREATE INDEX "cours_planifies_template_id_idx" ON "cours_planifies"("template_id");

-- AddForeignKey
ALTER TABLE "cours_planifies" ADD CONSTRAINT "cours_planifies_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "cours_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_holidays" ADD CONSTRAINT "school_holidays_prof_id_fkey" FOREIGN KEY ("prof_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_templates" ADD CONSTRAINT "cours_templates_groupe_id_fkey" FOREIGN KEY ("groupe_id") REFERENCES "groupes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
