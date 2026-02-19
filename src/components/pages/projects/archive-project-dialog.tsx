import React, { useCallback } from "react";
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
import { useToast } from "@/components/ui/toast";
import { apiPatch } from "@/lib/requests";
import type { Project, ProjectStatus, UpdateProjectInput } from "@/types";

interface ArchiveProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmation dialog for archiving or unarchiving a single project.
 * Shows the project name and explains what archiving means.
 */
export function ArchiveProjectDialog({
  project,
  open,
  onOpenChange,
}: ArchiveProjectDialogProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const isArchived = project?.status === "ARCHIVED";
  const targetStatus: ProjectStatus = isArchived ? "ACTIVE" : "ARCHIVED";

  const archiveMutation = useMutation({
    mutationFn: (data: UpdateProjectInput) =>
      apiPatch<Project>(`/projects/${project?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      addToast({
        title: isArchived
          ? `"${project?.name}" has been unarchived`
          : `"${project?.name}" has been archived`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      addToast({
        title: isArchived
          ? "Failed to unarchive project"
          : "Failed to archive project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = useCallback(() => {
    if (!project) return;
    archiveMutation.mutate({ status: targetStatus });
  }, [project, targetStatus, archiveMutation]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          {isArchived ? "Unarchive Project" : "Archive Project"}
        </DialogTitle>
        <DialogDescription>
          {isArchived
            ? `This will restore "${project.name}" to active status. Team members will be able to create and update tasks in this project again.`
            : `This will archive "${project.name}". Archived projects are read-only and hidden from the default view. You can unarchive it later.`}
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Project</dt>
              <dd className="font-medium text-gray-900">{project.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Current Status</dt>
              <dd className="font-medium text-gray-900">
                {project.status === "ACTIVE"
                  ? "Active"
                  : project.status === "ARCHIVED"
                  ? "Archived"
                  : "Completed"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Team Members</dt>
              <dd className="font-medium text-gray-900">
                {project.memberIds.length}
              </dd>
            </div>
          </dl>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant={isArchived ? "default" : "destructive"}
          onClick={handleConfirm}
          disabled={archiveMutation.isPending}
        >
          {archiveMutation.isPending
            ? isArchived
              ? "Unarchiving..."
              : "Archiving..."
            : isArchived
            ? "Unarchive"
            : "Archive"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
