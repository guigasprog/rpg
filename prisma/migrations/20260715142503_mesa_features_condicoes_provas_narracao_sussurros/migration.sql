-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "condicoes" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "autorId" TEXT,
ADD COLUMN     "destinoUserId" TEXT,
ADD COLUMN     "secreta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "imagemUrl" TEXT,
    "revelado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evidence_revelado_idx" ON "Evidence"("revelado");

-- CreateIndex
CREATE INDEX "Broadcast_ativo_idx" ON "Broadcast"("ativo");
