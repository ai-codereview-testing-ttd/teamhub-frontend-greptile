import React, { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiPatch } from "@/lib/requests";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface TaskListProps {
  tasks: Task[];
}

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "IN_REVIEW",
  IN_REVIEW: "DONE",
  DONE: null,
};

export function TaskList({ tasks }: TaskListProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const statusMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => apiPatch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast({ title: "Task status updated" });
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdvanceStatus = useCallback(
    (task: Task) => {
      const nextStatus = STATUS_TRANSITIONS[task.status];
      if (nextStatus) {
        statusMutation.mutate({ taskId: task.id, status: nextStatus });
      }
    },
    [statusMutation]
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No tasks found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task, index) => (
          <TableRow key={index}>
            <TableCell>
              <p className="font-medium text-gray-900">{task.title}</p>
              {task.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  TASK_STATUS_COLORS[task.status]
                }`}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  TASK_PRIORITY_COLORS[task.priority]
                }`}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
            </TableCell>
            <TableCell>
              {task.dueDate ? (
                <span
                  className={
                    isOverdue(task.dueDate) && task.status !== "DONE"
                      ? "text-red-600 font-medium"
                      : "text-gray-500"
                  }
                >
                  {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="text-gray-400">No due date</span>
              )}
            </TableCell>
            <TableCell>
              {STATUS_TRANSITIONS[task.status] && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdvanceStatus(task)}
                  disabled={statusMutation.isPending}
                >
                  Move to{" "}
                  {
                    TASK_STATUS_LABELS[
                      STATUS_TRANSITIONS[task.status] as TaskStatus
                    ]
                  }
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
