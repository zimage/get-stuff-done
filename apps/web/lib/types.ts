import type { AppRouter } from "@gsd/api";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ProjectListItem = RouterOutputs["projects"]["list"][number];
export type ProjectDetail = RouterOutputs["projects"]["get"];
export type ActionListItem = RouterOutputs["actions"]["list"][number];
export type TagListItem = RouterOutputs["tags"]["list"][number];
export type FolderListItem = RouterOutputs["folders"]["list"][number];
