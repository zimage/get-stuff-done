import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter, createContext, createRestContext } from "@gsd/api";
import Fastify, { type FastifyRequest } from "fastify";
import swaggerUiAbsolutePath from "swagger-ui-dist/absolute-path.js";
import { createOpenApiFetchHandler, generateOpenApiDocument } from "trpc-to-openapi";

const API_PREFIX = "/api";

// trpc-to-openapi's Fastify adapter feeds the Fastify request object straight
// into @trpc/server's raw-Node-stream request reader, which needs real
// EventEmitter/stream methods (`.once`, etc.) that Fastify's request wrapper
// doesn't have — it throws `req.once is not a function`. The Fetch adapter
// sidesteps this: a real `Request` instance short-circuits that code path
// entirely, so we bridge Fastify -> Fetch Request -> Fetch Response ourselves.
function toFetchRequest(request: FastifyRequest): Request {
  const url = `${request.protocol}://${request.hostname}${request.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  // Always re-serialized as JSON below, regardless of what the original
  // request declared (or omitted) — keep the header in sync, since the Fetch
  // Request constructor otherwise defaults an unlabeled string body to
  // text/plain, which trpc-to-openapi's content-type check then rejects.
  if (hasBody) headers.set("content-type", "application/json");
  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body ?? {}) : undefined,
  });
}

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

  const apiOrigin = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const openApiDocument = generateOpenApiDocument(appRouter, {
    title: "Get Stuff Done API",
    description:
      "REST API for Get Stuff Done. Authenticate with a personal access token " +
      "(create one at /settings) via `Authorization: Bearer <token>`.",
    version: "1.0.0",
    baseUrl: `${apiOrigin}/api`,
  });

  server.all(`${API_PREFIX}/*`, async (request, reply) => {
    const response = await createOpenApiFetchHandler({
      req: toFetchRequest(request),
      endpoint: API_PREFIX,
      router: appRouter,
      createContext: createRestContext,
    });

    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    reply.send(Buffer.from(await response.arrayBuffer()));
  });

  server.get("/openapi.json", async () => openApiDocument);

  await server.register(fastifyStatic, {
    root: swaggerUiAbsolutePath(),
    prefix: "/docs-assets/",
    decorateReply: false,
  });

  server.get("/docs", async (_request, reply) => {
    reply.type("text/html").send(`<!doctype html>
<html>
  <head>
    <title>Get Stuff Done API docs</title>
    <link rel="stylesheet" href="/docs-assets/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs-assets/swagger-ui-bundle.js"></script>
    <script src="/docs-assets/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: "StandaloneLayout",
        });
      };
    </script>
  </body>
</html>`);
  });

  const port = Number(process.env.PORT ?? 4000);
  await server.listen({ host: "0.0.0.0", port });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
