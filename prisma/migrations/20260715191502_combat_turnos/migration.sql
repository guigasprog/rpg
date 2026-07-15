-- CreateTable
CREATE TABLE "Combat" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "turnos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Combat_pkey" PRIMARY KEY ("id")
);
