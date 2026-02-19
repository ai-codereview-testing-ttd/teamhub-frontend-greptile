/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants";
import type { Task, TaskStatus, TaskPriority, FilterMode } from "@/types";
import debounce from "lodash/debounce";

export interface TaskFilters {
  search: string;
  status: TaskStatus | "ALL";
  priority: TaskPriority | "ALL";
  startDate: string;
  endDate: string;
}

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

// Client-side filter implementation for offline/cached mode
function applyClientSideFilters(tasks: Task[], filters: TaskFilters): Task[] {
  let filtered = [...tasks];
  if (filters.search) {
    filtered = filtered.filter((t) =>
      t.title.toLowerCase().includes(filters.search.toLowerCase())
    );
  }
  if (filters.status !== "ALL") {
    filtered = filtered.filter((t) => t.status === filters.status);
  }
  if (filters.priority !== "ALL") {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }
  return filtered;
}

export function TaskFiltersBar({
  filters,
  onFiltersChange,
}: TaskFiltersBarProps) {
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const debouncedSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        onFiltersChange({ ...filtersRef.current, search: value });
      }, 300),
    [onFiltersChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search tasks..."
          defaultValue={filters.search}
          onChange={(e) => debouncedSearchChange(e.target.value)}
        />
      </div>

      <Select
        value={filters.status}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            status: e.target.value as TaskStatus | "ALL",
          })
        }
      >
        <option value="ALL">All Statuses</option>
        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.priority}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            priority: e.target.value as TaskPriority | "ALL",
          })
        }
      >
        <option value="ALL">All Priorities</option>
        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Input
        type="date"
        className="w-40"
        value={filters.startDate}
        onChange={(e) =>
          onFiltersChange({ ...filters, startDate: e.target.value })
        }
        placeholder="Start date"
      />

      <Input
        type="date"
        className="w-40"
        value={filters.endDate}
        onChange={(e) =>
          onFiltersChange({ ...filters, endDate: e.target.value })
        }
        placeholder="End date"
      />
    </div>
  );
}
