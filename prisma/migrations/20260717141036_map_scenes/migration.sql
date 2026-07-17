-- CreateTable
CREATE TABLE "MapScene" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dados" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapScene_pkey" PRIMARY KEY ("id")
);
