# TeamHub Frontend

## Project Overview
TeamHub is a modern project management dashboard for organizing projects, tracking tasks, managing team members, and viewing analytics. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with `cn()` for class merging
- **State Management**: TanStack Query v5 (React Query) for server state
- **Forms**: React Hook Form v7 + Zod v4 for validation
- **Charts**: Recharts for data visualization
- **Testing**: Jest 30 + React Testing Library + ts-jest

## Project Structure
```
src/
  components/
    layout/          # Sidebar, AppLayout
    pages/           # Feature pages (projects-page.tsx, dashboard-page.tsx, etc.)
      <feature>/     # Co-located sub-components (dialogs, cards, tables)
    ui/              # Reusable UI primitives (Button, Input, Dialog, Badge, etc.)
  hooks/             # useAuth, useCurrentOrg
  lib/               # utils.ts, auth.ts, requests.ts, constants.ts
  pages/             # Next.js pages + BFF API routes
    api/             # BFF proxy routes (one file per resource)
  types/             # index.ts — all shared TypeScript types
  i18n/              # Translation files (next-i18next)
tests/               # Jest test suites (mirrors src/ structure)
```

## Architecture: BFF Proxy Pattern

All client-side API calls go through Next.js API routes (BFF) — never directly to the backend:

```
Browser → /api/projects  (Next.js BFF route)
              ↓
        fetch(API_BASE_URL + "/projects", { Authorization: token })
              ↓
        Backend API (port 8080)
```

**BFF route pattern** (`src/pages/api/<resource>/index.ts`):
```ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization;
  const url = new URL(`${API_BASE_URL}/projects`);
  // Forward query params if needed
  const response = await fetch(url.toString(), {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
```

BFF routes are pure pass-through proxies — no business logic, no body transformation.

## Data Fetching

### Typed API Helpers (`src/lib/requests.ts`)

All client-side API calls use the typed wrappers from `requests.ts`. They route to the BFF (`/api/...`) and auto-inject the auth token:

```ts
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/requests";

// Always provide the generic type parameter — required
const projects = await apiGet<PaginatedResponse<Project>>("/projects");
const project  = await apiPost<Project>("/projects", { body: data });
const updated  = await apiPatch<Project>(`/projects/${id}`, { body: data });
await apiDelete<void>(`/projects/${id}`);
```

`API_BASE` inside `requests.ts` is `"/api"` (the BFF prefix). `API_BASE_URL` in `constants.ts` is the backend URL used only in BFF routes.

### TanStack Query Patterns

**useQuery with error handling and staleTime:**
```ts
const { data, isLoading, isError } = useQuery({
  queryKey: ["projects"],
  queryFn: () => apiGet<PaginatedResponse<Project>>("/projects"),
  staleTime: 30_000,   // don't refetch within 30s
});

if (isLoading) return <LoadingState />;
if (isError) return <ErrorMessage />;   // must handle isError — empty state is not acceptable
```

**useMutation with invalidation:**
```ts
const queryClient = useQueryClient();

const createMutation = useMutation({
  mutationFn: (data: CreateProjectInput) =>
    apiPost<Project>("/projects", { body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    form.reset();
    onClose();
  },
});
```

Every `useMutation` `onSuccess` must call `invalidateQueries` on all related query keys — forgetting causes stale UI.

**Query key conventions:**
- Full list: `["projects"]`
- Single item: `["projects", projectId]`
- Nested resource: `["projects", projectId, "tasks"]`

## Forms (React Hook Form + Zod)

All forms use `useForm` with `zodResolver`. Manual `useState` for form fields is an anti-pattern:

```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit}>
      <Input {...form.register("name")} />
      {form.formState.errors.name && (
        <p>{form.formState.errors.name.message}</p>
      )}
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
```

**Rules:**
- All Zod validation errors must be displayed via `formState.errors`
- Reset form on mutation success: `form.reset()`
- Submit button must show loading state and be `disabled` while `isPending`

## Authentication

Auth is mocked for development in `src/lib/auth.ts`. The mock user is:

```ts
// MOCK_USER in src/lib/auth.ts — the source of truth for test data
const MOCK_USER: AuthUser = {
  id: "user_01HQ3XK123",
  email: "john@acme.com",
  name: "John Doe",
  organizationId: "org_01HQ3XJMR5E0987654321",
  role: "OWNER",
};
```

Use the `useAuth()` hook to access auth state and role checking:

```ts
const { user, isAuthenticated, hasRole } = useAuth();

// hasRole uses ROLE_HIERARCHY: OWNER(4) > ADMIN(3) > MEMBER(2) > VIEWER(1)
// hasRole("MEMBER") returns true for MEMBER, ADMIN, and OWNER
if (hasRole("ADMIN")) { /* show admin controls */ }
```

## TypeScript Conventions

All shared types live in `src/types/index.ts`. Key conventions:

```ts
// Enums are string union types — NOT TypeScript enum declarations
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

// Domain models use interface, not type alias
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  assigneeId: string | null;  // nullable: use "| null", not "| undefined"
  createdAt: string;          // dates are always ISO string, never Date object
}

// Paginated API responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Form inputs use optional fields for partial updates
export interface UpdateProjectInput {
  name?: string;          // optional: use "?:"
  description?: string;
}
```

- No `any` or `as any` — use `unknown` then narrow it
- All `apiGet`, `apiPost`, etc. calls must have a typed generic parameter
- Prefer `interface` over `type` for object shapes

## Component Conventions

### UI Primitives

Always use the project's shared UI components from `src/components/ui/` — never raw HTML elements:
- `Button` (variants: `default`, `destructive`, `outline`, `ghost`, `link`)
- `Input`, `Textarea`, `Select`
- `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogContent`, `DialogFooter`
- `Badge`, `Table`, `Card`

Do not use `window.confirm` for destructive actions — use `Dialog` instead.

### Class Merging

Use `cn()` from `@/lib/utils` for conditional Tailwind classes:
```ts
import { cn } from "@/lib/utils";
<div className={cn("base-class", isActive && "active-class", className)} />
```

### forwardRef

Use `React.forwardRef` on interactive leaf components (like `Button`, `Input`) — not on compound/container components (`Dialog`, card layouts). Set `displayName` explicitly:

```ts
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button className={cn(variantClasses[variant], className)} ref={ref} {...props} />
  )
);
Button.displayName = "Button";
```

### Page Component Pattern

Page components live in `src/components/pages/<feature>/`:

```ts
export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");

  const { data, isLoading, isError } = useQuery({ ... });

  const filteredProjects = useMemo(() => {
    if (!data?.data) return [];
    return statusFilter === "ALL" ? data.data
      : data.data.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Failed to load projects.</div>;

  return (
    <>
      <Button onClick={() => setShowCreate(true)}>New Project</Button>
      <ProjectTable projects={filteredProjects} />
      <CreateProjectDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
```

- Dialog open state is managed in the parent page via `open`/`onOpenChange` props
- Client-side filtering with `useMemo` is preferred for small lists
- Sub-components (dialogs, tables, cards) are co-located in the same feature folder

## Constants

All app-wide constants are in `src/lib/constants.ts`:

```ts
// Status/role display
export const TASK_STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", ... };
export const TASK_STATUS_COLORS: Record<string, string> = { TODO: "bg-gray-100 text-gray-800", ... };
export const ROLE_HIERARCHY: Record<string, number> = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

Use label/color maps from constants — do not hardcode display strings or Tailwind color classes inline.

## Security

- **User input display**: All user-generated content rendered to the DOM must be sanitized. `dangerouslySetInnerHTML` requires client-side sanitization — server-side alone is not sufficient.
- **Auth token storage**: Tokens must not be stored in `localStorage`. The BFF layer handles auth via server-side mechanisms.
- **Redirect URL validation**: Any URL from query params used in `router.push()` must be validated as a relative path to prevent open redirect vulnerabilities.
- **API secrets**: Never render the full secret for existing keys — show only a prefix or masked representation. The full secret may be shown once immediately after creation.

## Testing

Test files live in `tests/` (top-level, not co-located with source). The `@/` path alias is available in tests.

**Unit test pattern:**
```ts
describe("functionName", () => {
  it("does the expected thing for happy path", () => {
    expect(functionName(input)).toBe(expected);
  });
  it("handles edge case X", () => {
    expect(functionName(edgeCaseInput)).toEqual(expectedEdge);
  });
});
```

**Rules:**
- Pure functions in `src/lib/` with non-trivial logic must have tests
- Mock data in tests must exactly match the implementation it tests (e.g., `auth.test.ts` must use `john@acme.com` / `John Doe` / `OWNER` to match `auth.ts`)
- Test observable behavior, not internal state
- Date-sensitive tests use fixed past/future dates to avoid time-sensitivity

## Build & Dev Commands

```bash
npm run dev          # local dev server (port 3000)
npm run build        # production build
npm run lint         # ESLint
npm test             # Jest unit tests
npm test -- --watch  # Jest in watch mode
npx tsc --noEmit     # TypeScript type-check (no output)
npm ci               # clean install (CI)
```
