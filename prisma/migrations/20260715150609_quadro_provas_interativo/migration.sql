-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "x" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "y" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EvidenceNote" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "autorId" TEXT,
    "autorNome" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "contra" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceNote_evidenceId_idx" ON "EvidenceNote"("evidenceId");

-- CreateIndex
CREATE INDEX "EvidenceLink_fromId_idx" ON "EvidenceLink"("fromId");

-- CreateIndex
CREATE INDEX "EvidenceLink_toId_idx" ON "EvidenceLink"("toId");

-- AddForeignKey
ALTER TABLE "EvidenceNote" ADD CONSTRAINT "EvidenceNote_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
