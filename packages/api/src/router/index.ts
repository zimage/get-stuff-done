import { router } from "../trpc.js";
import { actionsRouter } from "./actions.js";
import { apiTokensRouter } from "./apiTokens.js";
import { authRouter } from "./auth.js";
import { foldersRouter } from "./folders.js";
import { projectsRouter } from "./projects.js";
import { tagsRouter } from "./tags.js";

export const appRouter = router({
  auth: authRouter,
  actions: actionsRouter,
  projects: projectsRouter,
  tags: tagsRouter,
  folders: foldersRouter,
  apiTokens: apiTokensRouter,
});

export type AppRouter = typeof appRouter;
