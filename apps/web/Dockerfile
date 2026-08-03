# syntax=docker/dockerfile:1
FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@11.15.1

COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# Cache mount persists pnpm's downloaded package store across builds (and
# shares it with apps/api's build, since the same --mount id is used there),
# so a rebuild only re-downloads packages that actually changed.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile
RUN pnpm --filter @gsd/db generate

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be build args (not just runtime env passed via docker-compose).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN pnpm --filter @gsd/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@gsd/web", "start"]
