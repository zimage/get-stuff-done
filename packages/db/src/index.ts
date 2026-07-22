import { PrismaClient } from "../generated/client/index.js";

declare global {
  // eslint-disable-next-line no-var
  var __gsdPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__gsdPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__gsdPrisma = prisma;
}

export * from "../generated/client/index.js";
