import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { apiPatch } from "@/lib/requests";
import { ROLE_HIERARCHY } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import type { Member, MemberRole, UpdateMemberRoleInput } from "@/types";

interface RoleManagementProps {
  member: Member;
  onRoleUpdated?: () => void;
}

export function RoleManagement({ member, onRoleUpdated }: RoleManagementProps) {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedRole, setSelectedRole] = useState<MemberRole>(member.role);
  const [isEditing, setIsEditing] = useState(false);

  const canManageRoles = hasRole("ADMIN");
  const isSelf = user?.id === member.id;
  const isOwner = member.role === "OWNER";

  const updateRoleMutation = useMutation({
    mutationFn: (data: UpdateMemberRoleInput) =>
      apiPatch(`/members/${member.id}/role`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      addToast({ title: "Role updated successfully" });
      setIsEditing(false);
      onRoleUpdated?.();
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (selectedRole === member.role) {
      setIsEditing(false);
      return;
    }
    updateRoleMutation.mutate({ role: selectedRole });
  };

  const handleCancel = () => {
    setSelectedRole(member.role);
    setIsEditing(false);
  };

  // Determine which roles the current user can assign
  const assignableRoles = (): MemberRole[] => {
    if (!user) return [];
    const currentUserLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const roles: MemberRole[] = ["ADMIN", "MEMBER", "VIEWER"];
    return roles.filter((r) => (ROLE_HIERARCHY[r] ?? 0) < currentUserLevel);
  };

  if (!canManageRoles || isSelf || isOwner) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Role:</span>
        <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
          {getRoleDisplayName(member.role)}
        </Badge>
        {isSelf && (
          <span className="text-xs text-gray-400">(you)</span>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Role:</span>
        <Badge variant="secondary">{getRoleDisplayName(member.role)}</Badge>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  const roles = assignableRoles();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Role:</span>
      <Select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value as MemberRole)}
        className="w-32"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {getRoleDisplayName(r)}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={updateRoleMutation.isPending}
      >
        {updateRoleMutation.isPending ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}

// Hardcoded display names for roles
function getRoleDisplayName(role: MemberRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Member";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

// --- Role Info Panel ---

interface RoleInfoPanelProps {
  role: MemberRole;
}

export function RoleInfoPanel({ role }: RoleInfoPanelProps) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Role Management</h3>
      <p className="text-sm text-gray-500 mt-1">
        Manage member roles and permissions
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Current role</span>
          <Badge variant="secondary">{getRoleDisplayName(role)}</Badge>
        </div>
        <div className="text-xs text-gray-500">
          {role === "ADMIN" && (
            <p>Full management access. Can invite members, manage projects, and configure settings.</p>
          )}
          {role === "MEMBER" && (
            <p>Standard access. Can create tasks, contribute to projects, and view team activity.</p>
          )}
          {role === "VIEWER" && (
            <p>Read-only access. Can view projects, tasks, and team activity but cannot make changes.</p>
          )}
          {role === "OWNER" && (
            <p>Organization owner. Has full control including billing, organization settings, and member management.</p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-400">
          Role changes take effect immediately. Members will be notified via email.
        </p>
      </div>
    </div>
  );
}
