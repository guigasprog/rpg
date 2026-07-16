-- AlterTable
ALTER TABLE "GameMap" ADD COLUMN     "fog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revelado" TEXT NOT NULL DEFAULT '[]';
