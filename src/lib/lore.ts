// Livro do Mestre — categorias e conteúdo-base fixo (in-world).
// O GM adiciona as próprias entradas por cima (salvas no banco).

export const LORE_CATEGORIES = [
  { key: "MONSTRO", label: "Monstros & Criaturas" },
  { key: "LOCAL", label: "Locais" },
  { key: "RITUAL_PNJ", label: "Rituais & PNJs" },
] as const;

export type LoreCategory = (typeof LORE_CATEGORIES)[number]["key"];

export function loreCategoryLabel(key: string): string {
  return LORE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export interface BaseLoreEntry {
  categoria: LoreCategory;
  titulo: string;
  conteudo: string;
  perigo: number; // 0-3
}

export const BASE_LORE: BaseLoreEntry[] = [
  // --- Monstros ---
  {
    categoria: "MONSTRO",
    titulo: "O Homem-Cinza",
    perigo: 2,
    conteudo:
      "Vive na periferia da visão. Você o vê ao virar a esquina, mas nunca de frente. Alimenta-se de certezas: quanto mais você duvida do que viu, mais forte ele fica. Não corra — ele anda na velocidade do seu medo.",
  },
  {
    categoria: "MONSTRO",
    titulo: "Os Que Sussurram no Cano",
    perigo: 1,
    conteudo:
      "Ouvidos encostados no encanamento à noite escutam nomes — inclusive o seu. Repetir o nome de volta é um convite. Água benta os cala por uma hora; depois voltam mais irritados.",
  },
  {
    categoria: "MONSTRO",
    titulo: "A Dama do Espelho",
    perigo: 3,
    conteudo:
      "Vive do outro lado de todo reflexo. Copia seus movimentos com meio segundo de atraso — até o dia em que se adianta. Quando isso acontece, um de vocês dois some. Cubra os espelhos da casa do morto.",
  },
  {
    categoria: "MONSTRO",
    titulo: "Os Sedentos (Vampiros)",
    perigo: 3,
    conteudo:
      "Esqueça o romance. São predadores antigos e pacientes que aprenderam a passar por gente. Não respiram, mas fingem. A luz do sol os enfraquece, não os mata; a fome, sim. Convidá-los a entrar é um erro que só se comete uma vez.",
  },
  {
    categoria: "MONSTRO",
    titulo: "A Legião Pálida (Mortos-Vivos)",
    perigo: 2,
    conteudo:
      "Não são lentos por burrice — são lentos porque têm todo o tempo do mundo. Vêm em número. O que os ergue não é magia barata, é uma vontade só, distante, chamando. Destrua a cabeça; queime o resto; não conte os corpos, sempre falta um.",
  },
  {
    categoria: "MONSTRO",
    titulo: "Aquilo Entre as Estrelas (Cósmico)",
    perigo: 3,
    conteudo:
      "Não é um monstro. É uma indiferença do tamanho de um céu. Vê-lo por inteiro parte a mente como vidro — perca Sanidade só de compreender que ele não te odeia; simplesmente não te percebe. Fuja da pergunta antes da resposta.",
  },
  {
    categoria: "MONSTRO",
    titulo: "O Coro de Rostos (Ilusões)",
    perigo: 2,
    conteudo:
      "Veste caras que você ama para chegar perto. Fala com a voz certa, lembra do que só vocês dois sabiam — quase. Erra um detalhe sempre: uma palavra fora de época, um piscar a mais. Confie no detalhe, não no rosto.",
  },
  // --- Locais ---
  {
    categoria: "LOCAL",
    titulo: "Edifício Marlowe",
    perigo: 3,
    conteudo:
      "No subsolo há uma porta que os arquitetos juram nunca ter desenhado. Ela respira. Selada em 1911 por uma linhagem que ninguém mais lembra. O zelador mente sobre a noite de 12/03 — pressione-o.",
  },
  {
    categoria: "LOCAL",
    titulo: "Bar do Mouh",
    perigo: 0,
    conteudo:
      "Território neutro. O véu é fino aqui, mas há um acordo antigo: ninguém sangra dentro do bar. Bom lugar para negociar com o que não deveria existir. Mouh aceita segredos como gorjeta.",
  },
  {
    categoria: "LOCAL",
    titulo: "Necrotério da Rua 9",
    perigo: 2,
    conteudo:
      "Os relógios pararam às 3h47 e não voltaram. Os corpos da gaveta 14 mudam de posição entre as visitas. O legista da noite não pisca — repare.",
  },
  // --- Rituais & PNJs ---
  {
    categoria: "RITUAL_PNJ",
    titulo: "Madame Joana Dark (PNJ)",
    perigo: 1,
    conteudo:
      "Médium do Bar do Mouh. Fala com os que já foram — por um preço em lembranças. Sabe mais do que conta e conta menos do que sabe. Cobra adiantado.",
  },
  {
    categoria: "RITUAL_PNJ",
    titulo: "O Homem do Chapéu Cinza (PNJ)",
    perigo: 0,
    conteudo:
      "Recruta para a Divisão de Casos Não-Arquiváveis na esquina da Rua 9. Não tem nome que valha a pena perguntar. Paga em espécie e silêncio. Sempre sabe onde você esteve.",
  },
  {
    categoria: "RITUAL_PNJ",
    titulo: "Ritual da Tinta Invisível",
    perigo: 2,
    conteudo:
      "Revela o que foi escrito no Irreal. Requer sangue de quem já cruzou o véu e uma vela que não projete sombra. Ler o texto revelado custa 1 de Sanidade por parágrafo. Não leia em voz alta.",
  },
  {
    categoria: "RITUAL_PNJ",
    titulo: "A Congregação do Olho Aberto (Cultistas)",
    perigo: 2,
    conteudo:
      "Fiéis devotos de Aquilo Entre as Estrelas. Não querem poder — querem que você também veja. Sorridentes, prestativos, aterrorizantemente normais. Reconhecem-se por uma cicatriz redonda na palma. Preparam a vinda; acham que estão ajudando.",
  },
  {
    categoria: "RITUAL_PNJ",
    titulo: "O Verbo Proibido",
    perigo: 3,
    conteudo:
      "Uma única palavra em língua morta que dobra o real por um instante. Conjuradores a usam para abrir, calar ou chamar. Cada uso custa Sanidade e deixa um eco — algo do outro lado agora sabe seu endereço.",
  },
];

export function baseLoreFor(categoria: string): BaseLoreEntry[] {
  return BASE_LORE.filter((e) => e.categoria === categoria);
}
