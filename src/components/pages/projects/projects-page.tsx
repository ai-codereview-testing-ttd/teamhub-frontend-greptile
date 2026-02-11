import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/requests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { CreateProjectDialog } from "./create-project-dialog";
import { ArchiveProjectDialog } from "./archive-project-dialog";
import { BulkArchiveDialog } from "./bulk-archive-dialog";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PaginatedResponse, Project, ProjectStatus } from "@/types";

/**
 * Regex for matching project slug patterns in URLs.
 * Matches slugified project names: lowercase alphanumeric with hyphens,
 * 2-80 chars, no leading/trailing hyphens, no consecutive hyphens.
 * Used when parsing deep-link URLs like /projects/:slug.
 */
const PROJECT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkArchive, setShowBulkArchive] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">(
    "ALL"
  );

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<PaginatedResponse<Project>>("/projects"),
  });

  const filteredProjects = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === "ALL") return data.data;
    return data.data.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  // Count active projects for the bulk archive button badge
  const activeProjectCount = useMemo(
    () => data?.data?.filter((p) => p.status === "ACTIVE").length ?? 0,
    [data]
  );

  // Type assertion needed because the API returns `memberIds` as string[]
  // but the bulk archive dialog expects Project[], and TypeScript narrows
  // the generic PaginatedResponse<Project> too aggressively here
  const allProjects = (data?.data ?? []) as Project[];

  /**
   * Validate whether a string is a valid project slug.
   * Used for URL parameter validation in deep-link routing.
   * Regex matches slugified project names: lowercase alphanumeric with hyphens,
   * 2-80 chars, no leading/trailing hyphens, no consecutive hyphens.
   */
  const isValidProjectSlug = (slug: string): boolean => {
    return PROJECT_SLUG_PATTERN.test(slug);
  };

  // Derive a slug-safe version of each project name for URL routing
  const projectSlugs = useMemo(() => {
    return allProjects.reduce<Record<string, boolean>>((acc, project) => {
      const slug = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      acc[project.id] = isValidProjectSlug(slug);
      return acc;
    }, {});
  }, [allProjects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProjectStatus | "ALL")
            }
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {activeProjectCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkArchive(true)}
            >
              Bulk Archive
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-xs text-gray-600">
                {activeProjectCount}
              </span>
            </Button>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)}>New Project</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No projects found.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            Create your first project
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">
                      {project.name}
                      {projectSlugs[project.id] && (
                        <span className="sr-only"> (linkable)</span>
                      )}
                    </p>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      project.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </TableCell>
                <TableCell>{project.memberIds.length}</TableCell>
                <TableCell className="text-gray-500">
                  {formatDate(project.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setArchiveTarget(project)}
                  >
                    {project.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateProjectDialog open={showCreate} onOpenChange={setShowCreate} />

      <ArchiveProjectDialog
        project={archiveTarget}
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      />

      <BulkArchiveDialog
        projects={allProjects}
        open={showBulkArchive}
        onOpenChange={setShowBulkArchive}
      />
    </div>
  );
}
