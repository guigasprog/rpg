# Arquivo Sombrio 🕵️‍♂️🔦

Fichário web para uma campanha de RPG de investigação paranormal (sistema caseiro
2d6). Cada personagem é um **dossiê** com abas de fichário, estética _detetive
noir / Spider-Noir_ (sépia, grão de filme, máquina de escrever, carimbo
"CONFIDENCIAL"). Quando o investigador descobre o **Irreal**, uma aba oculta se
revela com uma leve distorção.

Dois papéis: **Mestre (GM)** e **Jogador**.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tema noir em `src/app/globals.css`)
- **Prisma 6** + **SQLite** (dev). Portável para Postgres em produção.
- **Auth.js v5** (`next-auth`, provider Credentials + `bcryptjs`, sessão JWT)
- Fontes: _Special Elite_, _Oswald_, _IM Fell English_ (via `next/font`)

## Rodando localmente

```bash
npm install
cp .env.example .env      # gere um AUTH_SECRET (instruções no arquivo)
npm run db:migrate        # cria o banco SQLite (prisma/dev.db)
npm run db:seed           # cria contas e um dossiê de exemplo
npm run dev               # http://localhost:3000
```

### Contas de exemplo (do seed)

| Papel   | Usuário   | Senha        |
| ------- | --------- | ------------ |
| Mestre  | `mestre`  | `mestre123`  |
| Jogador | `jogador` | `jogador123` |

> Troque/remova essas contas antes de qualquer uso real.

### Scripts

| Script               | O que faz                                        |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Servidor de desenvolvimento (webpack — ver nota) |
| `npm run build`      | Build de produção (Turbopack)                    |
| `npm start`          | Servidor de produção                             |
| `npm run lint`       | ESLint                                           |
| `npm run db:migrate` | `prisma migrate dev`                             |
| `npm run db:seed`    | Popula o banco                                   |
| `npm run db:reset`   | Reseta o banco e re-semeia                       |

> **Nota sobre o `dev`**: usa `--webpack` porque o servidor _dev_ do Turbopack
> falha ao gerar um worker de PostCSS neste ambiente Windows (caminho com
> caractere acentuado). O `build` de produção usa Turbopack normalmente.

## Papéis e permissões

### Mestre (`MASTER`)

- Vê **todas** as fichas, incluindo a aba de Ocultismo e as anotações privadas.
- Cria/edita/exclui qualquer personagem; ajusta atributos, PV/SAN (atual e
  **máximo**).
- Libera/revoga o Ocultismo por personagem (com **timestamp**) e controla o
  **nível de exposição ao Irreal** (0–3).
- Escreve **anotações privadas** (nunca enviadas ao jogador).
- Cria contas de jogador (usuário + senha).

### Jogador (`PLAYER`)

- Vê apenas a(s) própria(s) ficha(s).
- Edita campos de posse do jogador: aparência, retrato, inventário, anotações
  pessoais e PV/SAN **atuais**.
- **Não** edita atributos (travados após a criação) nem os máximos de PV/SAN.
- **Nunca** vê a aba de Ocultismo — a menos que o GM tenha liberado para aquele
  personagem.

## Segurança (a parte que importa)

A ocultação **não é apenas visual**. O servidor decide o que sai no payload:

- `src/lib/character.ts → toCharacterDTO()` remove `masterNotes` e
  `occultismContent` do objeto antes de ele chegar ao cliente, salvo se o viewer
  for `MASTER` ou o dono com `occultismUnlocked = true`.
- As páginas são **Server Components** (`src/app/(app)/...`) e as mutações são
  **Server Actions** (`src/lib/actions.ts`), ambas revalidando papel/posse no
  servidor. O `src/proxy.ts` (proxy do Next 16, ex-middleware) bloqueia rotas
  `/mestre` para não-mestres.

Um jogador curioso inspecionando o DevTools/Network **não** encontra o conteúdo
oculto — ele não é enviado. Verificado em runtime (login real + inspeção do
HTML): conteúdo oculto ausente para o jogador com ficha travada, presente após a
liberação e para o Mestre.

## Sistema (2d6)

- 4 atributos (**-2 a 3**): **INV**, **COM**, **LAB**, **MEN**. Criação por
  _point-buy_: soma **5**.
- **Recursos:** `PV = 10 + COM` · `SAN = 10 + MEN` (+ ganho de classe por nível).
  Os máximos são **derivados**; os atuais aceitam **sobrevida** (> máx) e
  **valores negativos**. Barra de Sanidade em **azul**.
- **Classes:** **Combatente** (+PV/nível, +1 dado de dano), **Especialista**
  (foco em 2 atributos), **Ocultista** (obtido via _Proposta do Além_).
- **Níveis 0–25:** todos começam no Nível 0 (Comum); o GM promove. A cada 5
  níveis, uma habilidade de assinatura da classe.
- **Dano por arma:** cada item pode ter um dado (1d6, 2d6…); `dano = dado + COM`
  (Combatente rola 2× e usa o maior).
- **Proposta do Além:** com Ocultismo liberado, o GM envia um convite que aparece
  na ficha do jogador; ao aceitar, ele vira **Ocultista** e a aba de Ocultismo é
  revelada.
- Rolagem: `2d6 + atributo` → **10+** Total · **7–9** Parcial · **≤6** Falha.
  Regras em `src/lib/game.ts`. Design em `docs/superpowers/specs/`.

## Estrutura

```
src/
  app/
    (app)/                 # área autenticada (layout com header)
      personagens/         # lista, criação, ficha (dossiê com abas)
      mestre/              # painel do GM + edição total
    api/auth/[...nextauth] # handler do Auth.js
    login/                 # tela de login
  components/              # UI (ficha, medidores, dados, formulários...)
  lib/                     # prisma, auth/session, regras, validação, actions
  auth.ts / auth.config.ts # Auth.js (full / edge-safe p/ o proxy)
  proxy.ts                 # proteção de rotas
prisma/schema.prisma       # modelos User e Character
```

## Deploy na Vercel

1. Suba o repositório no GitHub e importe na Vercel.
2. Provisione um Postgres (ex.: Neon pelo Marketplace da Vercel) e ajuste
   `prisma/schema.prisma`: `provider = "postgresql"`.
3. Variáveis de ambiente: `DATABASE_URL` (Postgres), `AUTH_SECRET`,
   `AUTH_URL` (URL de produção).
4. `postinstall` já roda `prisma generate`. Rode as migrations
   (`prisma migrate deploy`) e o seed conforme necessário.
5. `push` na `main` → deploy automático; PRs geram _preview deploys_.

## Ideias de expansão

- Upload de retrato/pistas via **Vercel Blob**.
- "Enviar pista para o jogador X" a partir da mesa do Mestre.
- Log/histórico de sessão; efeitos "modo Irreal" mais intensos por nível.
