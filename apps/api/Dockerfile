FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@11.15.1

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @gsd/db generate

EXPOSE 4000
# Migrations run at container start (not build time) since they need a live
# DATABASE_URL, which is only available once the postgres service is healthy.
CMD ["sh", "-c", "pnpm --filter @gsd/db migrate:deploy && pnpm --filter @gsd/api-server start"]
