"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import * as Icons from "../../components/icons";
import { useShellState } from "../../lib/ShellStateProvider";
import { trpc } from "../../lib/trpc";

const STATUS_OPTIONS = ["active", "on_hold", "dropped"] as const;
type StatusFilter = "all" | (typeof STATUS_OPTIONS)[number];

export function TagsContextSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useShellState();
  const utils = trpc.useUtils();

  const [status, setStatus] = useState<StatusFilter>("active");
  const tagsQuery = trpc.tags.list.useQuery({ status: status === "all" ? undefined : status });
  const createMutation = trpc.tags.create.useMutation();

  async function handleNewTag() {
    const tag = await createMutation.mutateAsync({ title: "Untitled Tag" });
    utils.tags.list.invalidate();
    router.push(`/tags/${tag.id}?focusTitle=1`);
  }

  if (!shell.sidebarVisible) return null;

  return (
    <div className="context-sidebar">
      {shell.viewOptionsVisible && (
        <div className="context-sidebar-view-options">
          <p className="popover-title">View options</p>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="context-sidebar-list">
        <Link
          href="/tags/untagged"
          className={`tree-link ${pathname === "/tags/untagged" ? "tree-link-active" : ""}`}
        >
          Untagged
        </Link>
        {tagsQuery.isLoading && <p>Loading…</p>}
        {tagsQuery.data?.map((tag) => (
          <Link
            key={tag.id}
            href={`/tags/${tag.id}`}
            className={`tree-link ${pathname === `/tags/${tag.id}` ? "tree-link-active" : ""}`}
          >
            {tag.title}
          </Link>
        ))}
      </div>

      <div className="context-sidebar-footer">
        <button type="button" className="icon-button" onClick={handleNewTag} title="New tag">
          <Icons.PlusIcon />
        </button>
      </div>
    </div>
  );
}
