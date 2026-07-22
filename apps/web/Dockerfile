FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@11.15.1

COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --no-frozen-lockfile
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
