// ============================================================
// TeamHub Frontend — Shared Type Definitions
// ============================================================

// --- Enums / Unions ---

export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type BillingTier = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export enum FilterMode {
  SERVER = "SERVER",
  CLIENT = "CLIENT",
  STRICT = "STRICT", // Reserved for future use
}

// --- Domain Models ---

export interface Project {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  status: ProjectStatus;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  organizationId: string;
  avatarUrl: string | null;
  invitedAt: string;
  joinedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billingPlanId: string;
  memberCount: number;
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  defaultProjectVisibility: "public" | "private";
  allowGuestAccess: boolean;
  requireTwoFactor: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  tier: BillingTier;
  maxMembers: number;
  maxProjects: number;
  pricePerMonth: number;
  features: string[];
}

// --- API Types ---

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// --- Dashboard Types ---

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  totalMembers: number;
  tasksCompleted: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "task_created" | "task_completed" | "member_joined" | "project_created";
  description: string;
  actorName: string;
  createdAt: string;
}

// --- Form Types ---

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
  assigneeId?: string;
  priority: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  status?: TaskStatus;
}

export interface InviteMemberInput {
  email: string;
  role: MemberRole;
  name: string;
}

export interface UpdateMemberRoleInput {
  role: MemberRole;
}

// --- Auth Types ---

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: MemberRole;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}
