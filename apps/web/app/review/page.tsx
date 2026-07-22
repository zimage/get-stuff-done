"use client";

import { trpc } from "../../lib/trpc";
import { ProjectRow } from "../projects/ProjectRow";

export default function ReviewPage() {
  const projectsQuery = trpc.projects.list.useQuery({ dueForReview: true });

  return (
    <main className="projects">
      <header>
        <h1>Review</h1>
        <p className="form-hint">Projects whose review date has passed.</p>
      </header>

      {projectsQuery.isLoading && <p>Loading…</p>}
      {projectsQuery.error && <p>Failed to load projects: {projectsQuery.error.message}</p>}
      {projectsQuery.data?.length === 0 && <p>Nothing due for review.</p>}

      <ul className="project-list">
        {projectsQuery.data?.map((project) => (
          <ProjectRow key={project.id} project={project} defaultExpanded showMarkReviewed />
        ))}
      </ul>
    </main>
  );
}
