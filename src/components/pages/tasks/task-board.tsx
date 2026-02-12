import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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

interface TaskBoardProps {
  tasks: Task[];
}

type BoardState = Record<TaskStatus, Task[]>;

const BOARD_COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

function groupTasksByStatus(tasks: Task[]): BoardState {
  const groups: BoardState = {
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  };
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
}

interface DragState {
  taskId: string;
  sourceStatus: TaskStatus;
  sourceIndex: number;
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [boardState, setBoardState] = useState<BoardState>(() =>
    groupTasksByStatus(tasks)
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    status: TaskStatus;
    index: number;
  } | null>(null);

  // Sync board state when tasks prop changes
  useEffect(() => {
    setBoardState(groupTasksByStatus(tasks));
  }, [tasks]);

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
    },
    onError: (error: Error) => {
      // Revert optimistic update on failure
      setBoardState(groupTasksByStatus(tasks));
      addToast({
        title: "Failed to move task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragStart = useCallback(
    (taskId: string, status: TaskStatus, index: number) => {
      setDragState({ taskId, sourceStatus: status, sourceIndex: index });
    },
    []
  );

  const handleDragOver = useCallback(
    (status: TaskStatus, index: number) => {
      setDropTarget({ status, index });
    },
    []
  );

  // Handle reordering within the same column
  const handleDragEnd = (status: TaskStatus, fromIndex: number, toIndex: number) => {
    const columnTasks = boardState[status];
    const [moved] = columnTasks.splice(fromIndex, 1);
    columnTasks.splice(toIndex, 0, moved);
    setBoardState({ ...boardState, [status]: columnTasks });
  };

  // Handle moving a task to a different column
  const handleDrop = useCallback(
    (targetStatus: TaskStatus, targetIndex: number) => {
      if (!dragState) return;

      const { taskId, sourceStatus, sourceIndex } = dragState;

      if (sourceStatus === targetStatus) {
        // Same column reorder
        handleDragEnd(targetStatus, sourceIndex, targetIndex);
      } else {
        // Move to different column — optimistic update
        const task = boardState[sourceStatus][sourceIndex];
        if (!task) return;

        const newBoardState = { ...boardState };
        newBoardState[sourceStatus] = boardState[sourceStatus].filter(
          (t) => t.id !== taskId
        );
        const updatedTask = { ...task, status: targetStatus };
        const targetColumn = [...boardState[targetStatus]];
        targetColumn.splice(targetIndex, 0, updatedTask);
        newBoardState[targetStatus] = targetColumn;

        setBoardState(newBoardState);

        // Persist the status change to the API
        statusMutation.mutate({ taskId, status: targetStatus });
      }

      setDragState(null);
      setDropTarget(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragState, boardState, statusMutation]
  );

  const handleDragCancel = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          tasks={boardState[status]}
          isDragTarget={dropTarget?.status === status}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragCancel={handleDragCancel}
        />
      ))}
    </div>
  );
}

// --- Board Column ---

interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isDragTarget: boolean;
  onDragStart: (taskId: string, status: TaskStatus, index: number) => void;
  onDragOver: (status: TaskStatus, index: number) => void;
  onDrop: (status: TaskStatus, index: number) => void;
  onDragCancel: () => void;
}

function BoardColumn({
  status,
  tasks,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragCancel,
}: BoardColumnProps) {
  return (
    <div
      className={`flex-shrink-0 w-72 bg-gray-50 rounded-lg border ${
        isDragTarget ? "border-blue-400 bg-blue-50" : "border-gray-200"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(status, tasks.length);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status, tasks.length);
      }}
      onDragLeave={onDragCancel}
    >
      {/* Column header */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS_COLORS[status]}`}
            >
              {TASK_STATUS_LABELS[status]}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div className="p-2 space-y-2 min-h-[200px]">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={() => onDragStart(task.id, status, index)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

// --- Task Card ---

interface TaskCardProps {
  task: Task;
  onDragStart: () => void;
}

function TaskCard({ task, onDragStart }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white rounded-md border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <Badge className={`text-[10px] ${TASK_PRIORITY_COLORS[task.priority]}`}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>

        {task.dueDate && (
          <span
            className={`text-xs ${
              isOverdue(task.dueDate) && task.status !== "DONE"
                ? "text-red-500 font-medium"
                : "text-gray-400"
            }`}
          >
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
