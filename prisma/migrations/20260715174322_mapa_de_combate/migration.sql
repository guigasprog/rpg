-- CreateTable
CREATE TABLE "GameMap" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "backgroundUrl" TEXT,
    "bgX" INTEGER NOT NULL DEFAULT 0,
    "bgY" INTEGER NOT NULL DEFAULT 0,
    "bgW" INTEGER NOT NULL DEFAULT 960,
    "bgH" INTEGER NOT NULL DEFAULT 640,
    "cell" INTEGER NOT NULL DEFAULT 64,
    "showGrid" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapToken" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "characterId" TEXT,
    "ownerId" TEXT,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapToken_ownerId_idx" ON "MapToken"("ownerId");
