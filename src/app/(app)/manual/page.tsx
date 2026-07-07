import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL_POINTS,
  BASE_PV,
  BASE_SAN,
  CLASS_INFO,
  CLASS_MILESTONES,
  MAX_LEVEL,
  SUBCLASSES,
  WEAPON_DICE,
} from "@/lib/game";
import {
  OccultCross,
  OccultEye,
  Pentagram,
  Sigil,
  SigilRow,
  TripleMoon,
} from "@/components/OccultSigils";
import {
  Candle,
  Fleuron,
  Manicule,
  Raven,
  Skull,
} from "@/components/NewspaperArt";
import { FedoraIcon, MagnifierIcon } from "@/components/icons";

const CLASSIFICADOS = [
  {
    titulo: "Esta Noite",
    corpo:
      "Madame Joana Dark — a voz que fala com os que já foram. Bar do Mouh, 23h. Jazz, fumaça e uma sessão. Entrada: uma lembrança que você não quer mais.",
  },
  {
    titulo: "Vende-se",
    corpo:
      "Espelho que não reflete quem o compra. Ótimo estado, moldura de nogueira. Barato. Não pergunte por quê.",
  },
  {
    titulo: "Achados & Perdidos",
    corpo:
      "Devolvido ao dono um gato preto. Não é bem o mesmo gato. O dono também não é bem o mesmo.",
  },
  {
    titulo: "Previsão do Tempo",
    corpo:
      "Neblina densa vinda do porto. De novo. Leve o casaco e não olhe para trás quando ouvirem seu nome.",
  },
  {
    titulo: "Aulas Particulares",
    corpo:
      "Latim e idiomas que ninguém mais fala em voz alta. Turmas pequenas. Muito pequenas. Discrição absoluta.",
  },
  {
    titulo: "Obituário",
    corpo:
      "O relojoeiro da Rua 9 parou às 3h47. Curiosamente, todos os relógios da rua pararam no mesmo minuto.",
  },
];

export const dynamic = "force-dynamic";

const OPEN_CLASSES = ["COMBATENTE", "ESPECIALISTA"] as const;

export default async function ManualPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  // O ocultismo do manual só se revela ao GM ou a quem já teve o véu rompido
  // em algum personagem próprio.
  let occultRevealed = isMaster;
  if (!occultRevealed) {
    const cruzou = await prisma.character.count({
      where: { ownerId: viewer.id, occultismUnlocked: true },
    });
    occultRevealed = cruzou > 0;
  }

  const dados = WEAPON_DICE.filter((d) => d !== "").join(" · ");
  const classesVisiveis = occultRevealed
    ? (["COMBATENTE", "ESPECIALISTA", "OCULTISTA"] as const)
    : OPEN_CLASSES;

  return (
    <main className="mx-auto max-w-4xl">
      <div className="jornal folder-open relative rounded-md p-5 sm:p-8">
        {/* Manchete */}
        <header className="jornal-masthead mb-5 py-3 text-center">
          <p className="typewriter text-[0.65rem] tracking-widest text-sepia-dark">
            Divisão de Casos Não-Arquiváveis · Circulação Restrita
          </p>
          <h1 className="display text-4xl leading-none text-ink sm:text-5xl">
            O Arquivo Sombrio
          </h1>
          <p className="hand-title mt-1 text-xl">Compêndio do Investigador</p>
        </header>

        {/* Abertura */}
        <section className="mb-6">
          <p className="jornal-body dropcap text-[0.95rem]">
            Todos começam como gente comum: contas a pagar, um emprego morno, o
            jornal da manhã. Então uma porta que não deveria existir range no
            escuro — e o <em>Irreal</em> escorre para dentro. Este compêndio
            reúne o pouco que se sabe sobre sobreviver ao que há do outro lado
            do véu. Leia rápido. Nem toda página envelhece bem.
          </p>
          <p className="marginalia mt-2 text-lg">
            &ldquo;não confie no rodapé.&rdquo;
          </p>
        </section>

        {/* Anúncio de destaque */}
        <section className="anuncio mb-6 rounded-sm p-4">
          <div className="mb-1 flex items-center justify-center gap-3 text-ink">
            <FedoraIcon className="text-2xl" />
            <MagnifierIcon className="text-2xl" />
          </div>
          <h3 className="display text-2xl text-stamp">
            Procuram-se Investigadores
          </h3>
          <p className="jornal-body mx-auto mt-1 max-w-lg text-[0.85rem]">
            Discretos, curiosos e sem apego excessivo à própria sanidade. Não
            se exige experiência — exige-se coragem e sigilo.{" "}
            <Manicule className="inline text-base align-middle" /> Procure o
            homem do chapéu cinza na esquina da Rua 9. Não pergunte o nome dele.
          </p>
          <p className="typewriter mt-2 text-[0.65rem] text-sepia-dark">
            Divisão de Casos Não-Arquiváveis — pagamento em espécie e silêncio.
          </p>
        </section>

        <Rule />

        {/* Atributos + rolagem */}
        <SectionTitle>Dos Atributos &amp; da Sorte</SectionTitle>
        <div className="jornal-cols">
          <p className="jornal-body">
            Quatro medidas definem uma pessoa: <strong>Investigar (INV)</strong>,{" "}
            <strong>Combate (COM)</strong>, <strong>Lábia (LAB)</strong> e{" "}
            <strong>Mente (MEN)</strong>. Cada uma vai de{" "}
            <strong>{ATTR_MIN}</strong> a <strong>{ATTR_MAX}</strong>. Na
            criação distribuem-se <strong>{ATTR_TOTAL_POINTS} pontos</strong> —
            afiar uma virtude custa aceitar um defeito.
          </p>
          <p className="jornal-body">
            Quando o destino é incerto, rolam-se <strong>2d6</strong> e soma-se
            o atributo cabível. <strong>10 ou mais</strong>: Sucesso Total.{" "}
            <strong>7 a 9</strong>: Sucesso Parcial — consegue-se, mas cobra-se
            um preço. <strong>6 ou menos</strong>: Falha, e o Mestre sorri.
          </p>
        </div>
        <p className="marginalia mt-2 text-lg">&ldquo;o parcial sempre morde.&rdquo;</p>

        <Rule />

        {/* Recursos */}
        <SectionTitle>Do Corpo &amp; da Mente</SectionTitle>
        <div className="jornal-cols">
          <p className="jornal-body">
            A carne mede-se em <strong>Pontos de Vida</strong> e a lucidez em{" "}
            <strong>Sanidade</strong>. Ao nascer para o ofício:{" "}
            <strong>PV = {BASE_PV} + Combate</strong> e{" "}
            <strong>Sanidade = {BASE_SAN} + Mente</strong>. Classe e nível
            engrossam esses números com o tempo.
          </p>
          <p className="jornal-body">
            Ambos podem transbordar o máximo — a isso chamam{" "}
            <strong>sobrevida</strong>, fôlego emprestado. E ambos podem cair{" "}
            <strong>abaixo de zero</strong>: um corpo em número negativo agoniza;
            uma mente negativa já não é bem sua.
          </p>
        </div>

        <Rule />

        {/* Vocações */}
        <SectionTitle>Das Vocações</SectionTitle>
        <p className="jornal-body mb-4">
          Na criação escolhe-se entre <strong>Combatente</strong> e{" "}
          <strong>Especialista</strong>.{" "}
          {occultRevealed ? (
            <>
              A terceira senda, a do <strong>Ocultista</strong>, não se escolhe —
              ela escolhe você.{" "}
            </>
          ) : null}
          Adiante, o Mestre pode liberar uma <strong>subclasse</strong>: uma
          especialização dentro da vocação.
        </p>

        <div className="space-y-5">
          {classesVisiveis.map((c) => {
            const oculto = c === "OCULTISTA";
            return (
              <article
                key={c}
                className={`border-t border-double pt-3 ${
                  oculto ? "border-stamp/50 glitch" : "border-sepia-ink/40"
                }`}
              >
                {oculto && <SigilRow className="mb-3 text-lg" />}
                <h3
                  className={`text-2xl ${oculto ? "oculto-titulo inline-flex items-center gap-2" : "hand-title"}`}
                >
                  {oculto && <Sigil className="text-xl" />}
                  {CLASS_INFO[c].label}
                </h3>
                <p className="jornal-body italic">{CLASS_INFO[c].descricao}</p>
                <p className="typewriter mt-1 text-xs text-sepia-dark">
                  Ganho por nível: +{CLASS_INFO[c].pvPorNivel} PV · +
                  {CLASS_INFO[c].sanPorNivel} Sanidade
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {SUBCLASSES[c].map((s) => (
                    <div
                      key={s.key}
                      className={`rounded border p-2.5 ${
                        oculto
                          ? "border-stamp/30 bg-stamp/[0.05]"
                          : "border-sepia-ink/25 bg-black/[0.04]"
                      }`}
                    >
                      <p className="hand text-lg leading-tight">{s.label}</p>
                      <p className="jornal-body text-[0.8rem] italic">
                        {s.descricao}
                      </p>
                      <ul className="mt-1 list-disc pl-4">
                        {s.habilidades.map((h, i) => (
                          <li
                            key={i}
                            className="jornal-body text-[0.78rem] leading-snug"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}

          {!occultRevealed && <SealedBlock />}
        </div>

        <Rule />

        {/* Níveis */}
        <SectionTitle>Da Ascensão (0 a {MAX_LEVEL})</SectionTitle>
        <div className="jornal-cols">
          <p className="jornal-body">
            Ninguém nasce herói. Começa-se no <strong>Nível 0 — Comum</strong>,
            e só o primeiro <em>evento paranormal</em> desperta a subida (o
            Mestre conduz).
          </p>
          <p className="jornal-body">
            De cinco em cinco níveis (5, 10, 15, 20, 25) desperta uma{" "}
            <strong>habilidade de assinatura</strong> — o que separa um amador de
            uma lenda urbana.
          </p>
        </div>
        <div
          className={`mt-3 grid gap-3 ${
            classesVisiveis.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {classesVisiveis.map((c) => (
            <div key={c} className={c === "OCULTISTA" ? "glitch" : ""}>
              <p className={`text-lg ${c === "OCULTISTA" ? "oculto-titulo" : "hand"}`}>
                {CLASS_INFO[c].label}
              </p>
              <ul className="mt-1 space-y-0.5">
                {CLASS_MILESTONES[c].slice(0, 3).map((m) => (
                  <li key={m.level} className="jornal-body text-[0.78rem]">
                    <strong>Nv {m.level}:</strong> {m.nome}
                  </li>
                ))}
                <li className="typewriter text-[0.65rem] text-sepia-dark">
                  …e mais até o 25.
                </li>
              </ul>
            </div>
          ))}
        </div>

        <Rule />

        {/* Dano */}
        <SectionTitle>Do Dano &amp; das Armas</SectionTitle>
        <p className="jornal-body">
          Cada arma carrega seu próprio dado. O estrago é{" "}
          <strong>o dado da arma + Combate</strong>. Um <strong>Combatente</strong>{" "}
          bate mais fundo: rola o dado <strong>duas vezes</strong> e fica com o
          maior. Dados conhecidos: <strong>{dados}</strong>.
        </p>

        <Rule />

        {/* Proposta do Além — selada até liberar */}
        {occultRevealed ? (
          <section className="glitch">
            <SigilRow className="mb-3 text-xl" />
            <h2 className="oculto-titulo mb-2 inline-flex items-center gap-2 text-3xl">
              <Pentagram className="text-2xl" /> Da Proposta do Além
            </h2>
            <div className="jornal-cols">
              <p className="jornal-body">
                Uma vez rompido o véu, há quem escute uma oferta. Não vem em
                palavras — vem como certeza fria na nuca. O Mestre a apresenta;
                cabe a você <strong>aceitar</strong> ou <strong>recusar</strong>.
              </p>
              <p className="jornal-body">
                Aceitar faz de você um <strong>Ocultista</strong> e abre a página
                que sempre esteve ali, ilegível até agora. Ninguém disse que o
                preço estaria escrito na frente.
              </p>
            </div>
            <p className="marginalia mt-3 text-xl">
              &ldquo;eu aceitei. não aceite.&rdquo;
            </p>
            <SigilRow className="mt-4 text-lg" />
          </section>
        ) : (
          <SealedBlock />
        )}

        <Rule />

        {/* Classificados & Boatos */}
        <div className="mb-2 flex items-center justify-center gap-3 text-ink">
          <Raven className="text-3xl" />
          <SectionTitle>Classificados &amp; Boatos</SectionTitle>
          <Candle className="text-2xl" />
        </div>
        <p className="jornal-body mb-4 text-center text-[0.8rem] italic">
          A cidade sussurra. Algumas destas linhas são verdade. Boa sorte
          adivinhando quais.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSIFICADOS.map((c) => (
            <div key={c.titulo} className="classificado rounded-sm p-3">
              <h4 className="text-sm text-stamp">{c.titulo}</h4>
              <p className="jornal-body mt-1 text-[0.78rem] leading-snug">
                {c.corpo}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-sepia-ink/70">
          <Skull className="text-xl" />
          <Fleuron className="text-2xl" />
          <Skull className="text-xl" />
        </div>

        <footer className="jornal-masthead mt-6 py-2 text-center">
          <p className="typewriter text-[0.65rem] tracking-widest text-sepia-dark">
            Fim da edição — queime após a leitura
          </p>
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="hand-title mb-2 mt-1 text-3xl text-ink">{children}</h2>;
}

function Rule() {
  return (
    <div className="my-6 flex items-center justify-center gap-3">
      <span className="h-px flex-1 bg-sepia-ink/30" />
      <span className="ink-blot inline-block h-2 w-2" />
      <span className="ink-blot inline-block h-3 w-3" />
      <span className="ink-blot inline-block h-2 w-2" />
      <span className="h-px flex-1 bg-sepia-ink/30" />
    </div>
  );
}

// Bloco cifrado: só símbolos, sem tradução, com glitch. Mostrado enquanto o
// Mestre não liberar o ocultismo. Padrão fixo (determinístico p/ hidratação).
function SealedBlock() {
  const SIGILS = [Pentagram, TripleMoon, Sigil, OccultCross, OccultEye];
  const COLS = 7;
  const pattern = [
    2, 0, 3, 1, 4, 2, 0, 4, 2, 0, 3, 1, 4, 2, 1, 4, 2, 0, 3, 1, 3,
  ];
  const rot = [-13, 9, -5, 14, -8, 4, 12];
  const size = [
    "text-2xl",
    "text-3xl",
    "text-xl",
    "text-4xl",
    "text-2xl",
    "text-3xl",
    "text-xl",
  ];
  return (
    <div className="selado glitch relative my-4 rounded-md px-4 py-7" aria-hidden>
      <div className="flex flex-col gap-5">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center justify-center gap-5 text-stamp/80"
          >
            {Array.from({ length: COLS }, (_, col) => {
              const Icon = SIGILS[pattern[row * COLS + col] % SIGILS.length];
              return (
                <Icon
                  key={col}
                  className={size[col]}
                  style={{ transform: `rotate(${rot[col]}deg)` }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
