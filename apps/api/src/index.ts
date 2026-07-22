import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter, createContext } from "@gsd/api";
import Fastify from "fastify";

async function main() {
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  await server.register(cookie);

  server.get("/health", async () => ({ status: "ok" }));

  await server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  const port = Number(process.env.PORT ?? 4000);
  await server.listen({ host: "0.0.0.0", port });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
