import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { BASE_LORE } from "../src/lib/lore";

const prisma = new PrismaClient();

async function main() {
  const masterPass = await bcrypt.hash("mestre123", 10);
  const playerPass = await bcrypt.hash("jogador123", 10);

  const master = await prisma.user.upsert({
    where: { username: "mestre" },
    update: { role: "MASTER" },
    create: { username: "mestre", passwordHash: masterPass, role: "MASTER" },
  });

  const player = await prisma.user.upsert({
    where: { username: "jogador" },
    update: {},
    create: { username: "jogador", passwordHash: playerPass, role: "PLAYER" },
  });

  const existing = await prisma.character.findFirst({
    where: { ownerId: player.id },
  });

  if (!existing) {
    await prisma.character.create({
      data: {
        name: "Cora Vittori",
        playerName: "Jogador Demo",
        ownerId: player.id,
        occupation: "Fotógrafa de necrológios do Clarim da Meia-Noite",
        appearance:
          "Casaco encharcado, cigarro apagado no canto da boca, olhos que não dormem desde terça.",
        classe: "ESPECIALISTA",
        nivel: 0,
        especialistaFocos: JSON.stringify(["attrInvestigar", "attrMente"]),
        attrInvestigar: 3,
        attrCombate: 0,
        attrLabia: 1,
        attrMente: 1,
        pvAtual: 10,
        pvMax: 10,
        sanAtual: 8,
        sanMax: 11,
        inventory: JSON.stringify([
          { nome: "Câmera Kodak 35mm", dano: "" },
          { nome: "Isqueiro sem gás", dano: "" },
          { nome: "Canivete", dano: "1d6" },
          { nome: "Revólver .38", dano: "2d6" },
        ]),
        playerNotes:
          "O zelador do edifício Marlowe mente sobre a noite de 12/03. Voltar lá.",
        masterNotes:
          "Cora é descendente da linhagem que selou a Porta em 1911. Ela ainda não sabe.",
        occultismUnlocked: false,
        occultismLevel: 0,
        occultismContent:
          "A Porta no subsolo do Marlowe não é metáfora. O que respira do outro lado atende por nomes que enferrujam a língua.",
      },
    });
  }

  // Conteúdo inicial do Livro do Mestre (só se ainda não houver nenhum).
  const loreCount = await prisma.loreEntry.count();
  if (loreCount === 0) {
    await prisma.loreEntry.createMany({
      data: BASE_LORE.map((e) => ({
        categoria: e.categoria,
        titulo: e.titulo,
        conteudo: e.conteudo,
        perigo: e.perigo,
        revelado: false,
      })),
    });
  }

  console.log("Seed concluído.");
  console.log("  Mestre  -> usuário: mestre   | senha: mestre123");
  console.log("  Jogador -> usuário: jogador  | senha: jogador123");
  console.log(`  (${master.username} / ${player.username})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
