/**
 * Duck-typed Prisma `where` fragments (no @prisma/client import here — this
 * package stays DB-agnostic) — pass the result straight into
 * `prisma.project.findMany({ where: visibleProjectsWhere(userId) })` etc. so
 * visibility is enforced in SQL rather than filtered after the fact.
 */
export function visibleProjectsWhere(userId: string) {
  return {
    OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
  };
}

export function visibleActionsWhere(userId: string) {
  return {
    OR: [
      { createdById: userId },
      { assignedToId: userId },
      { project: visibleProjectsWhere(userId) },
    ],
  };
}

export function canWriteProject(project: { ownerId: string }, userId: string): boolean {
  return project.ownerId === userId;
}

export function canReviewProject(project: { ownerId: string }, userId: string): boolean {
  return canWriteProject(project, userId);
}

export function canWriteAction(
  action: { createdById: string; assignedToId: string | null },
  userId: string,
): boolean {
  return action.createdById === userId || action.assignedToId === userId;
}

// Tags are always private to their owner — there's no family-sharing concept
// for tags (unlike projects/actions).
export function canWriteTag(tag: { ownerId: string }, userId: string): boolean {
  return tag.ownerId === userId;
}

// Folders are a personal organizational layer over a user's own projects —
// also always private, same as tags.
export function canWriteFolder(folder: { ownerId: string }, userId: string): boolean {
  return folder.ownerId === userId;
}

export function canShareProjectWith(
  targetUser: { familyId: string | null },
  actingUser: { familyId: string | null },
): boolean {
  return (
    targetUser.familyId != null &&
    actingUser.familyId != null &&
    targetUser.familyId === actingUser.familyId
  );
}
