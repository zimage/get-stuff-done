interface TagLike {
  title: string;
  parentTagId: string | null;
}

/** Builds "Parent : Child : Leaf" from a tag's ancestor chain (root to leaf). */
export function buildTagPath(tagId: string, tagsById: Map<string, TagLike>): string {
  const segments: string[] = [];
  let currentId: string | null = tagId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break; // corrupt-data guard, not a real cycle
    visited.add(currentId);
    const tag = tagsById.get(currentId);
    if (!tag) break;
    segments.unshift(tag.title);
    currentId = tag.parentTagId;
  }

  return segments.join(" : ");
}
