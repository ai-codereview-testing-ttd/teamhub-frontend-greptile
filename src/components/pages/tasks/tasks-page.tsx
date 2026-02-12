import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/requests";
import { TaskList } from "./task-list";
import { TaskFiltersBar, type TaskFilters } from "./task-filters";
import type { PaginatedResponse, Task } from "@/types";

const INITIAL_FILTERS: TaskFilters = {
  search: "",
  status: "ALL",
  priority: "ALL",
  startDate: "",
  endDate: "",
};

export function TasksPage() {
  const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.status !== "ALL") params.status = filters.status;
    if (filters.priority !== "ALL") params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return params;
  }, [filters]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks", queryParams],
    queryFn: () =>
      apiGet<PaginatedResponse<Task>>("/tasks", queryParams),
  });

  // Refresh data when component mounts
  useEffect(() => {
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <TaskFiltersBar filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">Loading tasks...</p>
        </div>
      ) : (
        <TaskList tasks={data?.data ?? []} />
      )}
    </div>
  );
}
