import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/requests";
import { MEMBER_ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { formatDate } from "@/lib/utils";
import type {
  Member,
  MemberRole,
  PaginatedResponse,
} from "@/types";

// Email validation pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateRole(role: string): boolean {
  return ["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(role);
}

interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  invitedAt: string;
  expiresAt: string;
}

export function TeamSettings() {
  const { user, hasRole } = useAuth();
  const { organization } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [quickInviteEmail, setQuickInviteEmail] = useState("");
  const [quickInviteRole, setQuickInviteRole] = useState<MemberRole>("MEMBER");
  const [emailError, setEmailError] = useState<string | null>(null);

  const canManageTeam = hasRole("ADMIN");

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => apiGet<PaginatedResponse<Member>>("/members"),
  });

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: () => apiGet<PendingInvite[]>("/members/invites/pending"),
    enabled: canManageTeam,
  });

  const quickInviteMutation = useMutation({
    mutationFn: (data: { email: string; role: MemberRole }) =>
      apiPost("/members/invite", { ...data, name: data.email.split("@")[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      addToast({ title: "Invitation sent" });
      setQuickInviteEmail("");
      setEmailError(null);
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiDelete(`/members/invites/${inviteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      addToast({ title: "Invitation revoked" });
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to revoke invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiDelete(`/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      addToast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: MemberRole;
    }) => apiPatch(`/members/${memberId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      addToast({ title: "Role updated" });
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickInvite = () => {
    const trimmed = quickInviteEmail.trim().toLowerCase();

    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!validateRole(quickInviteRole)) {
      setEmailError("Invalid role selected");
      return;
    }

    // Check if already a member
    const existingMember = membersData?.data.find(
      (m) => m.email.toLowerCase() === trimmed
    );
    if (existingMember) {
      setEmailError("This person is already a team member");
      return;
    }

    setEmailError(null);
    quickInviteMutation.mutate({ email: trimmed, role: quickInviteRole });
  };

  const handleRemoveMember = (member: Member) => {
    if (member.id === user?.id) {
      addToast({
        title: "Cannot remove yourself",
        variant: "destructive",
      });
      return;
    }
    if (
      window.confirm(
        `Remove ${member.name} from the team? They will lose access immediately.`
      )
    ) {
      removeMemberMutation.mutate(member.id);
    }
  };

  const handleRoleChange = (memberId: string, newRole: MemberRole) => {
    updateRoleMutation.mutate({ memberId, role: newRole });
  };

  const members = membersData?.data ?? [];

  return (
    <div className="space-y-8">
      {/* Team Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Team Management
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage your team members, roles, and invitations.
        </p>
        {organization && (
          <p className="text-sm text-gray-400 mt-1">
            Organization: {organization.name}
          </p>
        )}
      </div>

      {/* Quick Invite */}
      {canManageTeam && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Quick Invite
          </h4>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                type="email"
                value={quickInviteEmail}
                onChange={(e) => {
                  setQuickInviteEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="colleague@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickInvite();
                }}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            <Select
              value={quickInviteRole}
              onChange={(e) =>
                setQuickInviteRole(e.target.value as MemberRole)
              }
              className="w-32"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </Select>
            <Button
              onClick={handleQuickInvite}
              disabled={quickInviteMutation.isPending}
            >
              {quickInviteMutation.isPending ? "Sending..." : "Invite"}
            </Button>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {canManageTeam && pendingInvites && pendingInvites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Pending Invitations ({pendingInvites.length})
          </h4>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {invite.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Invited {formatDate(invite.invitedAt)} as{" "}
                    {MEMBER_ROLE_LABELS[invite.role]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revokeInviteMutation.mutate(invite.id)}
                  disabled={revokeInviteMutation.isPending}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Team Members ({members.length})
        </h4>
        {membersLoading || invitesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                      {member.id === user?.id && (
                        <span className="text-gray-400 ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageTeam &&
                  member.role !== "OWNER" &&
                  member.id !== user?.id ? (
                    <Select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as MemberRole
                        )
                      }
                      className="w-28 text-sm"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </Select>
                  ) : (
                    <Badge
                      variant={
                        member.role === "OWNER" ? "default" : "secondary"
                      }
                    >
                      {MEMBER_ROLE_LABELS[member.role]}
                    </Badge>
                  )}
                  {canManageTeam &&
                    member.role !== "OWNER" &&
                    member.id !== user?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
