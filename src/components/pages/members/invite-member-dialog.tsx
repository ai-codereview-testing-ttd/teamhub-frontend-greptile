/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiPost } from "@/lib/requests";
import { MEMBER_ROLE_LABELS } from "@/lib/constants";
import type { MemberRole } from "@/types";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Email validation pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const INVITABLE_ROLES: MemberRole[] = ["ADMIN", "MEMBER", "VIEWER"];

function validateRole(role: string): boolean {
  return ["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(role);
}

export function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validateRole(role)) {
      newErrors.role = "Invalid role selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response: any = await apiPost("/members/invite", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      addToast({ title: "Invitation sent successfully" });
      handleClose();
    },
    onError: (error: any) => {
      const message =
        error?.message || "Failed to send invitation. Please try again.";
      addToast({
        title: "Invitation failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    inviteMutation.mutate({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
    });
  };

  const handleClose = () => {
    setEmail("");
    setName("");
    setRole("MEMBER");
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle>Invite Team Member</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <form id="invite-member-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="invite-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Role
              </label>
              <Select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {role === "ADMIN"
                  ? "Admins can manage projects, tasks, and members."
                  : role === "MEMBER"
                  ? "Members can create and manage tasks within assigned projects."
                  : "Viewers have read-only access to projects and tasks."}
              </p>
            </div>
          </div>
        </form>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="invite-member-form"
          disabled={inviteMutation.isPending}
        >
          {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
