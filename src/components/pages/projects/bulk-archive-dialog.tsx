import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { apiPatch } from "@/lib/requests";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Project, UpdateProjectInput } from "@/types";

interface BulkArchiveDialogProps {
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ArchiveResult {
  projectId: string;
  projectName: string;
  success: boolean;
  error?: string;
}

/**
 * Dialog for bulk-archiving multiple projects at once.
 * Displays a selectable list of active projects and processes
 * them in parallel using Promise.all.
 */
export function BulkArchiveDialog({
  projects,
  open,
  onOpenChange,
}: BulkArchiveDialogProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ArchiveResult[] | null>(null);

  // Only show projects that can be archived (i.e., currently ACTIVE)
  const archivableProjects = useMemo(
    () => projects.filter((p) => p.status === "ACTIVE"),
    [projects]
  );

  const toggleSelection = useCallback((projectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(archivableProjects.map((p) => p.id)));
  }, [archivableProjects]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const archiveProject = async (
    project: Project
  ): Promise<ArchiveResult> => {
    try {
      const data: UpdateProjectInput = { status: "ARCHIVED" };
      await apiPatch(`/projects/${project.id}`, data);
      return {
        projectId: project.id,
        projectName: project.name,
        success: true,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      return {
        projectId: project.id,
        projectName: project.name,
        success: false,
        error: message,
      };
    }
  };

  const bulkArchiveMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      const projectsToArchive = archivableProjects.filter((p) =>
        projectIds.includes(p.id)
      );
      return Promise.all(projectsToArchive.map(archiveProject));
    },
    onSuccess: (archiveResults) => {
      setResults(archiveResults);

      const successCount = archiveResults.filter((r) => r.success).length;
      const failureCount = archiveResults.filter((r) => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      if (failureCount === 0) {
        addToast({
          title: `Successfully archived ${successCount} project${
            successCount !== 1 ? "s" : ""
          }`,
        });
      } else {
        addToast({
          title: `Archived ${successCount} project${
            successCount !== 1 ? "s" : ""
          }, ${failureCount} failed`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      addToast({
        title: "Bulk archive failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) return;
    setResults(null);
    bulkArchiveMutation.mutate(Array.from(selectedIds));
  }, [selectedIds, bulkArchiveMutation]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setResults(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const allSelected =
    archivableProjects.length > 0 &&
    selectedIds.size === archivableProjects.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle>Bulk Archive Projects</DialogTitle>
        <DialogDescription>
          Select the projects you want to archive. Archived projects become
          read-only and are hidden from the default view.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {results ? (
          /* Results view */
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Archive Results
            </p>
            {results.map((result) => (
              <div
                key={result.projectId}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                  result.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                <span>{result.projectName}</span>
                <span className="text-xs">
                  {result.success ? "Archived" : result.error}
                </span>
              </div>
            ))}
          </div>
        ) : archivableProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No active projects available to archive.
          </div>
        ) : (
          /* Selection view */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {selectedIds.size} of {archivableProjects.length} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={allSelected ? deselectAll : selectAll}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {archivableProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id)}
                    onChange={() => toggleSelection(project.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.memberIds.length} members, created{" "}
                      {formatDate(project.createdAt)}
                    </p>
                  </div>
                  <Badge variant="default">
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        {results ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={
                selectedIds.size === 0 || bulkArchiveMutation.isPending
              }
            >
              {bulkArchiveMutation.isPending
                ? `Archiving ${selectedIds.size}...`
                : `Archive ${selectedIds.size} Project${
                    selectedIds.size !== 1 ? "s" : ""
                  }`}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
