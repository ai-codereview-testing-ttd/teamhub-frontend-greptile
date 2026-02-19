import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/requests";
import { MEMBER_ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Member } from "@/types";

// --- Individual Member Card ---

interface MemberCardProps {
  member: Member;
}

function MemberCard({ member }: MemberCardProps) {
  // Fetch the avatar for this specific member so we get the latest
  // profile image rather than relying on the stale URL in the member object
  const { data: avatar } = useQuery({
    queryKey: ["member-avatar", member.id],
    queryFn: () =>
      apiGet<{ url: string }>(`/members/${member.id}/avatar`),
    staleTime: 5 * 60 * 1000,
  });

  const avatarUrl = avatar?.url ?? member.avatarUrl;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${member.name}'s avatar`}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{member.name}</h4>
          <p className="text-sm text-gray-500 truncate">{member.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={member.role === "OWNER" ? "default" : "secondary"}
            >
              {MEMBER_ROLE_LABELS[member.role]}
            </Badge>
            <span className="text-xs text-gray-400">
              {member.joinedAt
                ? `Joined ${formatDate(member.joinedAt)}`
                : "Pending invite"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Members Grid Container ---

interface MembersGridProps {
  members: Member[];
}

export function MembersGrid({ members }: MembersGridProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No members found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
