"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import * as Icons from "../../components/icons";
import { getDragPayload, setDragPayload } from "../../lib/dragDrop";
import { useShellState } from "../../lib/ShellStateProvider";
import { useStatusMessage } from "../../lib/StatusMessageProvider";
import { trpc } from "../../lib/trpc";
import type { TagListItem } from "../../lib/types";

export function TagsContextSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const shell = useShellState();
  const utils = trpc.useUtils();
  const { setMessage } = useStatusMessage();

  const [collapsedTagIds, setCollapsedTagIds] = useState<Set<string>>(new Set());
  const [dragOverTagId, setDragOverTagId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const tagsQuery = trpc.tags.list.useQuery({
    status: shell.tagFilters.status === "all" ? undefined : shell.tagFilters.status,
  });
  const createMutation = trpc.tags.create.useMutation();
  const updateMutation = trpc.tags.update.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
    onError: (error) => setMessage(error.message),
  });

  const tags = tagsQuery.data ?? [];

  const tagsByParent = useMemo(() => {
    const map = new Map<string | null, TagListItem[]>();
    for (const tag of tags) {
      const list = map.get(tag.parentTagId) ?? [];
      list.push(tag);
      map.set(tag.parentTagId, list);
    }
    return map;
  }, [tags]);

  function toggleTag(id: string) {
    setCollapsedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleNewTag() {
    const tag = await createMutation.mutateAsync({ title: "Untitled Tag" });
    utils.tags.list.invalidate();
    router.push(`/tags/${tag.id}?focusTitle=1`);
  }

  function handleDropOnTag(tag: TagListItem, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverTagId(null);
    const payload = getDragPayload(event);
    if (!payload || payload.kind !== "tag" || payload.id === tag.id) return;
    updateMutation.mutate({ id: payload.id, parentTagId: tag.id });
  }

  function handleDropOnRoot(event: DragEvent) {
    event.preventDefault();
    setDragOverRoot(false);
    const payload = getDragPayload(event);
    if (!payload || payload.kind !== "tag") return;
    updateMutation.mutate({ id: payload.id, parentTagId: null });
  }

  function renderTag(tag: TagListItem): React.ReactNode {
    const isCollapsed = collapsedTagIds.has(tag.id);
    const children = tagsByParent.get(tag.id) ?? [];
    const isActive = pathname === `/tags/${tag.id}`;
    const hasChildren = children.length > 0;

    return (
      <div key={tag.id}>
        <div
          className={`folder-tree-item ${dragOverTagId === tag.id ? "drop-target-active" : ""}`}
          draggable
          onDragStart={(event) => setDragPayload(event, { kind: "tag", id: tag.id })}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOverTagId(tag.id);
          }}
          onDragLeave={() => setDragOverTagId((current) => (current === tag.id ? null : current))}
          onDrop={(event) => handleDropOnTag(tag, event)}
        >
          {hasChildren ? (
            <button className="folder-tree-toggle" onClick={() => toggleTag(tag.id)}>
              {isCollapsed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="folder-tree-toggle" />
          )}
          <Link href={`/tags/${tag.id}`} className={`tree-link ${isActive ? "tree-link-active" : ""}`}>
            {tag.title}
          </Link>
        </div>
        {hasChildren && !isCollapsed && (
          <div className="tree-children">{children.map(renderTag)}</div>
        )}
      </div>
    );
  }

  if (!shell.sidebarVisible) return null;

  const rootTags = tagsByParent.get(null) ?? [];

  return (
    <div className="context-sidebar">
      <div
        className={`context-sidebar-list ${dragOverRoot ? "drop-target-active" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOverRoot(true);
        }}
        onDragLeave={() => setDragOverRoot(false)}
        onDrop={handleDropOnRoot}
      >
        <Link
          href="/tags/untagged"
          className={`tree-link ${pathname === "/tags/untagged" ? "tree-link-active" : ""}`}
        >
          Untagged
        </Link>
        {tagsQuery.isLoading && <p>Loading…</p>}
        {rootTags.map(renderTag)}
      </div>

      <div className="context-sidebar-footer">
        <button type="button" className="icon-button" onClick={handleNewTag} title="New tag">
          <Icons.PlusIcon />
        </button>
      </div>
    </div>
  );
}
