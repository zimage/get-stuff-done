# syntax=docker/dockerfile:1
FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@11.15.1

COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# Cache mount persists pnpm's downloaded package store across builds (and
# shares it with apps/web's build, since the same --mount id is used there),
# so a rebuild only re-downloads packages that actually changed.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
RUN pnpm --filter @gsd/db generate

EXPOSE 4000
# Migrations run at container start (not build time) since they need a live
# DATABASE_URL, which is only available once the postgres service is healthy.
CMD ["sh", "-c", "pnpm --filter @gsd/db migrate:deploy && pnpm --filter @gsd/api-server start"]
