import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPost, apiDelete } from "@/lib/requests";
import { formatDate, getRelativeTime } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  secretKey: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

const AVAILABLE_SCOPES = [
  { value: "read:projects", label: "Read Projects" },
  { value: "write:projects", label: "Write Projects" },
  { value: "read:tasks", label: "Read Tasks" },
  { value: "write:tasks", label: "Write Tasks" },
  { value: "read:members", label: "Read Members" },
  { value: "admin", label: "Admin (Full Access)" },
];

export function ApiKeysSection() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiGet<ApiKey[]>("/settings/api-keys"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateApiKeyInput) =>
      apiPost<ApiKey>("/settings/api-keys", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      addToast({ title: "API key created successfully" });
      setShowCreate(false);
      setNewKeyName("");
      setSelectedScopes([]);
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => apiDelete(`/settings/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      addToast({ title: "API key revoked" });
    },
    onError: (error: Error) => {
      addToast({
        title: "Failed to revoke API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      addToast({
        title: "Key name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      name: newKeyName.trim(),
      scopes: selectedScopes,
    });
  };

  const handleRevoke = (keyId: string, keyName: string) => {
    if (window.confirm(`Revoke API key "${keyName}"? This cannot be undone.`)) {
      deleteMutation.mutate(keyId);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading API keys...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys for programmatic access to your organization.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create New Key"}
        </Button>
      </div>

      {/* Create new key form */}
      {showCreate && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., CI/CD Pipeline, Monitoring Service"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scopes
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => toggleScope(scope.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedScopes.includes(scope.value)
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Key"}
            </Button>
          </div>
        </div>
      )}

      {/* API Keys list */}
      {!apiKeys || apiKeys.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p>No API keys yet.</p>
          <p className="text-sm mt-1">Create one to get started with the API.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                    {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>

                  {/* Display the full key so user can easily copy it for integration */}
                  <code className="text-sm bg-gray-100 p-2 rounded block break-all font-mono">
                    {apiKey.secretKey}
                  </code>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey.secretKey);
                      addToast({ title: "Copied to clipboard" });
                    }}
                  >
                    Copy Key
                  </Button>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {apiKey.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Created {formatDate(apiKey.createdAt)}</span>
                    {apiKey.lastUsedAt && (
                      <span>Last used {getRelativeTime(apiKey.lastUsedAt)}</span>
                    )}
                    {apiKey.expiresAt && (
                      <span>Expires {formatDate(apiKey.expiresAt)}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(apiKey.id, apiKey.name)}
                  disabled={deleteMutation.isPending}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
