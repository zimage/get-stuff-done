# Get Stuff Done

A multi-user GTD (Getting Things Done) app: Actions live in Projects, Projects live in Folders, everything can be tagged, and work can be shared within a Family. Includes a direct REST API with personal access tokens alongside the web app.

## Stack

pnpm workspace + Turborepo monorepo — Next.js (App Router) frontend, Fastify + tRPC API, Prisma/PostgreSQL, Google sign-in.

## Quick start

```bash
cp .env.example .env   # fill in GOOGLE_CLIENT_ID at minimum
docker compose up --build -d
```

- Web app: http://localhost:3000
- API + interactive docs: http://localhost:4000/docs

## Development

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @gsd/db migrate
pnpm exec turbo run dev
```

See [CLAUDE.md](./CLAUDE.md) for architecture notes, commands, and conventions.

## License

GPL-3.0 — see [LICENSE](./LICENSE).
