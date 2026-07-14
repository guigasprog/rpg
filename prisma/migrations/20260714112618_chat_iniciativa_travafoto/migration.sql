-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "retratoTravado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorRole" TEXT NOT NULL DEFAULT 'PLAYER',
    "tipo" TEXT NOT NULL DEFAULT 'CHAT',
    "texto" TEXT NOT NULL,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeEntry" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "atual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InitiativeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
