-- CreateTable
CREATE TABLE "Clock" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "segmentos" INTEGER NOT NULL DEFAULT 6,
    "preenchido" INTEGER NOT NULL DEFAULT 0,
    "visivel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Clock_visivel_idx" ON "Clock"("visivel");
