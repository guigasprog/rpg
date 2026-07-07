# Arquivo Sombrio — Amplificação (classes, níveis, dano, proposta do Além)

Data: 2026-07-06
Status: aprovado (design em conversa) → implementação

## Objetivo

Ampliar o fichário do RPG com sistema de **classes**, **progressão por níveis
(0–25)**, **fórmula de PV/SAN**, **dados de dano por arma**, mecânica de
**"Proposta do Além"** (virar Ocultista) e uma **UI mais mobile** e polida,
mantendo a estética noir. Reforçar permissões: o jogador edita a própria ficha,
exceto ocultismo/notas do Mestre; atributos e nível seguem sob controle do GM.

## Regras do sistema (2d6)

### Atributos
- Quatro atributos: **INV** (Investigar), **COM** (Combate), **LAB** (Lábia),
  **MEN** (Mente).
- Intervalo: **-2 a 3** (`ATTR_MIN = -2`, `ATTR_MAX = 3`).
- Criação por point-buy: soma **exatamente 5**. Regra "ao menos um 0" **removida**
  (não faz sentido com negativos).
- Após a criação, só o **GM** altera atributos.

### Classes
- Escolhidas na **criação**: **Especialista** ou **Combatente** (o GM pode trocar).
- **Combatente:** ganho maior de PV; **+1 dado de dano** (rola o dado da arma 2×
  e usa o maior).
- **Especialista:** define **2 atributos de foco** (bônus/rerrolagem temáticos).
- **Ocultista:** classe especial, obtida só via **Proposta do Além** (abaixo).

### Níveis (0 → 25)
- Todo personagem começa no **Nível 0 — "Comum"** (pessoa normal).
- O **GM** promove para o Nível 1 no **primeiro evento paranormal**; daí em diante
  o GM controla o nível (0–25). O jogador nunca altera o nível.
- **Ganho por nível (1–25), por classe:**
  | Classe | por nível |
  |---|---|
  | Combatente | +2 PV, +1 SAN |
  | Especialista | +1 PV, +2 SAN |
  | Ocultista | +1 PV, +3 SAN |
- **Níveis marco (5, 10, 15, 20, 25):** destravam uma **habilidade de assinatura**
  (texto exibido na ficha; o GM narra o efeito). Lista abaixo.

### PV / Sanidade
- **Base (Nível 0):** `PV = 10 + Combate` · `SAN = 10 + Mente`.
- **Máximos derivados:** `máx = base + soma dos ganhos da classe do nível 1..N`.
  O máximo NÃO é editado à mão — muda via atributo/classe/nível (recalculado no
  servidor). Como COM/MEN podem ser negativos, o máximo tem piso de **1**.
- **Atuais (sobrevida + negativos):** o valor atual **não é mais preso** ao
  intervalo `0..máx`. Pode:
  - passar do máximo → **sobrevida** (mostrada como segmento/badge distinto);
  - ficar **negativo** (mostrado em vermelho). Faixa aceita: **-99 a 999**.

### Dados de dano (por arma)
- Inventário passa a ser lista de itens `{ nome: string, dano?: string }`,
  onde `dano` é um código de dado: `1d3` (desarmado), `1d6` (leve), `1d8`,
  `2d6` (arma de fogo), etc. (ou vazio = item sem dano).
- **Dano = dado da arma + Combate.** Combatente rola o dado **2× e usa o maior**.
- Botão "Rolar dano" por arma na ficha, reusando o visual do rolador.

## Proposta do Além (virar Ocultista)

- Pré-requisito: o GM libera **Ocultismo ≥ 1** naquele personagem.
- O GM **dispara uma "Proposta do Além"** com um texto/convite. Estado no
  personagem: `propostaStatus` ∈ {NENHUMA, PENDENTE, ACEITA, RECUSADA} +
  `propostaTexto`.
- Na ficha do jogador, quando `PENDENTE`, aparece um **evento dramático**
  ("Uma proposta ecoa do outro lado…") com **Aceitar / Recusar**.
- **Aceitar** → `classe = OCULTISTA`, `propostaStatus = ACEITA`, garante
  `occultismUnlocked = true` e `occultismLevel ≥ 1` (revela a aba com o efeito de
  tinta invisível). **Recusar** → `RECUSADA`; o GM pode reenviar (volta a
  PENDENTE).
- Sem tempo real: a proposta aparece ao abrir/atualizar a ficha (pode ganhar
  auto-refresh leve depois).

## Ocultismo & permissões

- **Reveal mantido:** o jogador vê a aba de Ocultismo **só depois** de liberado
  (via proposta aceita ou toggle do GM).
- **Jogador edita** na própria ficha: aparência, retrato, inventário (com dado de
  arma), anotações, **PV/SAN atuais**, classe **na criação** e aceitar/recusar
  proposta.
- **Só GM:** atributos (após criação), nível, foco do Especialista, notas
  privadas, conteúdo e nível de ocultismo, disparo/reset da proposta.

## Habilidades de marco (propostas — GM adjudica)

**Combatente** — 5 Instinto de Rua (rerrola 1 dado de dano/cena) · 10 Ossos Duros
(+5 PV; ignora 1º dano leve da cena) · 15 Segunda Natureza (ataca 2× no 10+) ·
20 Veterano (imune a medo comum) · 25 Última Trincheira (age +1 turno em PV
negativo antes de cair).

**Especialista** — 5 Olho Clínico (Falha→Parcial 1×/cena no foco) · 10 Repertório
(+1 atributo de foco) · 15 Preparado (item improvisado/sessão) · 20 Mente Afiada
(rerrola MEN/INV 1×/cena) · 25 Autoridade (Sucesso Total automático 1×/sessão no
foco).

**Ocultista** — 5 Primeiro Sussurro (1 pergunta ao Irreal/sessão) · 10 Pacto Menor
(gasta SAN pra rerrolar) · 15 Visão do Véu (detecta entidades) · 20 Verbo
Proibido (efeito sobrenatural, custo de SAN) · 25 Comunhão (diálogo de igual com
o Irreal).

## UI / Mobile

- **Mobile-first:** abas do fichário roláveis/empilháveis, alvos de toque
  maiores, medidores de PV/SAN maiores com passo +/−, layout fluido.
- **Atributos:** selos ("carimbos") repaginados exibindo valor (incl. negativos)
  e botão de rolagem por atributo.
- **Recursos:** barras maiores com quebra da fórmula (base + classe + nível);
  **sobrevida** e **negativo** com tratamento visual; **badge de Classe e Nível**
  no topo da ficha e nos cards.
- **Sanidade em azul** (troca o gradiente atual).
- **Login:** o carimbo **"CONFIDENCIAL"** some no início e **"bate" (anima) só
  depois da tentativa de login**, como um documento sendo carimbado.

## Modelo de dados — novos campos em `Character`

- `classe` (String): `ESPECIALISTA | COMBATENTE | OCULTISTA`.
- `nivel` (Int, default 0): 0–25.
- `especialistaFocos` (String? JSON): até 2 chaves de atributo.
- `inventory` (String? JSON): passa a `Array<{ nome, dano? }>`.
- `propostaStatus` (String, default `NENHUMA`) + `propostaTexto` (String?).
- PV/SAN **máx passam a ser derivados** (recalculados no servidor); atuais aceitam
  sobrevida/negativo.

Migração: acrescentar colunas com defaults; inventário antigo (array de strings)
é convertido para `{ nome }` na leitura (compatibilidade).

## Fora de escopo (agora)

- Motor de habilidades automatizado (marcos são texto que o GM adjudica).
- Tempo real/push de verdade para a proposta (aparece no load/refresh).
- Upload de retrato (segue por URL).
