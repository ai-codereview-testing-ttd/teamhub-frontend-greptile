import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiGet } from "@/lib/requests";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants";
import { StatsCards } from "./stats-cards";
import { ActivityFeed } from "./activity-feed";
import type { DashboardStats } from "@/types";

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"];

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiGet<DashboardStats>("/analytics/dashboard"),
    select: (data: DashboardStats) => data,
    staleTime: 60_000,
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
  };

  const filteredData = stats?.recentActivity.filter(
    a => a.type !== "member_joined"
  ) ?? [];

  const statusChartData = stats
    ? Object.entries(stats.tasksByStatus).map(([status, count]) => ({
        name: TASK_STATUS_LABELS[status] || status,
        count,
      }))
    : [];

  const priorityChartData = stats
    ? Object.entries(stats.tasksByPriority).map(([priority, count]) => ({
        name: TASK_PRIORITY_LABELS[priority] || priority,
        value: count,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        Unable to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-8" data-chart-options={JSON.stringify(chartOptions)}>
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks by Status Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks by Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by Priority Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks by Priority
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {priorityChartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ActivityFeed activities={filteredData} />
    </div>
  );
}
