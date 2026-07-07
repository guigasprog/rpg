# Deploy — Arquivo Sombrio (Vercel + Neon, grátis)

O código já está pronto para produção: Prisma em **PostgreSQL**, migração inicial
Postgres em `prisma/migrations/`, e o build da Vercel roda `prisma migrate deploy`
automaticamente (`vercel-build`).

Custo: **R$0** (Vercel Hobby + Neon free tier).

---

## 1. Banco: Neon Postgres (grátis)

1. Crie conta em <https://neon.tech> (pode logar com GitHub).
2. Crie um projeto → copie a **connection string POOLED** (a que tem `-pooler`
   no host), algo como:
   `postgresql://user:senha@ep-xxxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require`

## 2. Rodar local contra o Neon (uma vez)

No arquivo `.env` (local), coloque:

```
DATABASE_URL="<sua connection string pooled do Neon>"
AUTH_SECRET="<gere um: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\">"
AUTH_TRUST_HOST=true
```

> **Nunca** comite o `AUTH_SECRET` nem a `DATABASE_URL` — ficam só no `.env`
> (que está no `.gitignore`) e nas variáveis da Vercel.

Depois:

```bash
npm install
npm run db:deploy   # aplica a migração no Neon
npm run db:seed     # cria mestre/jogador + Livro do Mestre
npm run dev         # http://localhost:3000 (agora usando Neon)
```

> Contas do seed: **mestre / mestre123** e **jogador / jogador123** — troque
> depois pelo painel do Mestre.

## 3. GitHub

```bash
git add -A
git commit -m "Arquivo Sombrio"
# crie um repo no GitHub e:
git remote add origin https://github.com/SEU_USUARIO/arquivo-sombrio.git
git push -u origin main
```

## 4. Vercel

1. Crie conta em <https://vercel.com> (logar com GitHub).
2. **Add New → Project** → importe o repositório.
3. Em **Settings → Environment Variables**, adicione (Production + Preview):
   - `DATABASE_URL` = a connection string pooled do Neon
   - `AUTH_SECRET` = o mesmo valor do seu `.env` local
   - `AUTH_TRUST_HOST` = `true`
   - `AUTH_URL` = a URL do projeto (ex.: `https://arquivo-sombrio.vercel.app`)
     — pode ajustar depois que a Vercel gerar o domínio.
4. **Deploy.** O `vercel-build` roda `prisma migrate deploy` (cria as tabelas no
   Neon) e depois `next build`.
5. Se o banco ainda estiver vazio, rode o seed uma vez (local, com a mesma
   `DATABASE_URL` do Neon no `.env`): `npm run db:seed`.

Pronto: cada `git push` na branch principal gera um novo deploy automático; PRs
geram *preview deploys*.

---

## Notas

- **Cookies seguros**: em produção (HTTPS) o Auth.js usa cookies seguros — na
  Vercel funciona nativo. O problema de login sobre HTTP era só local.
- **Neon pooled**: use a string *pooled* (serverless-friendly). A *direct* pode
  esgotar conexões em funções serverless.
- **Trocar o `AUTH_SECRET`**: se quiser outro, gere com
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  e atualize no `.env` local e na Vercel (isso desloga todos).
- **Dev local** agora também usa Neon (precisa de internet). Se quiser um banco
  local separado, dá para rodar um Postgres local e apontar a `DATABASE_URL`.
