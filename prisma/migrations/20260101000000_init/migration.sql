-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoreEntry" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "perigo" INTEGER NOT NULL DEFAULT 0,
    "imagemUrl" TEXT,
    "revelado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "ownerId" TEXT,
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "portraitUrl" TEXT,
    "occupation" TEXT,
    "appearance" TEXT,
    "attrInvestigar" INTEGER NOT NULL DEFAULT 0,
    "attrCombate" INTEGER NOT NULL DEFAULT 0,
    "attrLabia" INTEGER NOT NULL DEFAULT 0,
    "attrMente" INTEGER NOT NULL DEFAULT 0,
    "classe" TEXT NOT NULL DEFAULT 'ESPECIALISTA',
    "subclasse" TEXT,
    "nivel" INTEGER NOT NULL DEFAULT 0,
    "especialistaFocos" TEXT,
    "pvAtual" INTEGER NOT NULL DEFAULT 10,
    "pvMax" INTEGER NOT NULL DEFAULT 10,
    "sanAtual" INTEGER NOT NULL DEFAULT 10,
    "sanMax" INTEGER NOT NULL DEFAULT 10,
    "propostaStatus" TEXT NOT NULL DEFAULT 'NENHUMA',
    "propostaTexto" TEXT,
    "inventory" TEXT,
    "playerNotes" TEXT,
    "masterNotes" TEXT,
    "occultismUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "occultismLevel" INTEGER NOT NULL DEFAULT 0,
    "occultismContent" TEXT,
    "occultismUnlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "LoreEntry_categoria_idx" ON "LoreEntry"("categoria");

-- CreateIndex
CREATE INDEX "Character_ownerId_idx" ON "Character"("ownerId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

