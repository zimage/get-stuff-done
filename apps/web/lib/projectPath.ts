interface FolderLike {
  title: string;
  parentFolderId: string | null;
}

interface ProjectLike {
  title: string;
  folderId: string | null;
}

/** Builds "Folder : Subfolder : Project title" from a project's folder ancestor chain (root to leaf), ending in the project's own title. */
export function buildProjectPath(project: ProjectLike, foldersById: Map<string, FolderLike>): string {
  const segments: string[] = [];
  let currentFolderId: string | null = project.folderId;
  const visited = new Set<string>();

  while (currentFolderId) {
    if (visited.has(currentFolderId)) break; // corrupt-data guard, not a real cycle
    visited.add(currentFolderId);
    const folder = foldersById.get(currentFolderId);
    if (!folder) break;
    segments.unshift(folder.title);
    currentFolderId = folder.parentFolderId;
  }

  segments.push(project.title);
  return segments.join(" : ");
}
