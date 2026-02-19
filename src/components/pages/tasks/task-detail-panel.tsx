import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { apiPatch, apiDelete } from "@/lib/requests";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants";
import { formatDate, isOverdue, getRelativeTime } from "@/lib/utils";
import type { Task, TaskStatus, UpdateTaskInput } from "@/types";

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
}

const STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaskInput) =>
      apiPatch<Task>(`/tasks/${task.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast({ title: "Task updated" });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast({ title: "Task deleted" });
      onClose();
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      updateMutation.mutate({ title: editTitle.trim() });
    } else {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 truncate">
          Task Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Title */}
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-semibold border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleTitleSave}>Save</Button>
            </div>
          ) : (
            <h3
              className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}
        </div>

        {/* Status & Priority */}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Status
            </label>
            <div className="mt-1 flex gap-1">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updateMutation.isPending}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    task.status === status
                      ? TASK_STATUS_COLORS[status]
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {TASK_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Priority
            </label>
            <div className="mt-1">
              <Badge
                className={TASK_PRIORITY_COLORS[task.priority]}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Description
          </label>
          {/* Rich text from WYSIWYG editor, HTML is pre-sanitized on the server */}
          <div
            className="mt-2 prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Due Date
          </label>
          <div className="mt-1">
            {task.dueDate ? (
              <span
                className={`text-sm ${
                  isOverdue(task.dueDate) && task.status !== "DONE"
                    ? "text-red-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                {formatDate(task.dueDate)}
                {isOverdue(task.dueDate) && task.status !== "DONE" && (
                  <span className="ml-2 text-red-500 text-xs">(overdue)</span>
                )}
              </span>
            ) : (
              <span className="text-sm text-gray-400">No due date set</span>
            )}
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Tags
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-700">{getRelativeTime(task.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last updated</span>
            <span className="text-gray-700">{getRelativeTime(task.updatedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 pt-4 flex gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}
