# TeamHub Frontend

## Project Overview
TeamHub is a modern project management dashboard for organizing projects, tracking tasks, managing team members, and viewing analytics. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form + Zod for validation
- **Charts**: Recharts for data visualization
- **Internationalization**: next-i18next
- **Testing**: Jest + React Testing Library

## Project Structure
```
src/
  components/
    layout/          # Sidebar, AppLayout
    pages/           # Feature pages (dashboard, projects, tasks, members)
    ui/              # Reusable UI components (button, input, table, dialog)
  hooks/             # useAuth, useCurrentOrg
  lib/               # Utilities, constants, auth, API helpers
  pages/             # Next.js pages + BFF API routes
  types/             # TypeScript type definitions
  i18n/              # Translation files
tests/               # Jest test suites
```

## Architecture Patterns

### Backend-for-Frontend (BFF)
API routes in `src/pages/api/` proxy requests to the backend service. All client-side requests go through these BFF endpoints for security and data transformation.

### Authentication
Mock authentication system using hardcoded JWT tokens for development. Auth state managed via `useAuth` hook with localStorage persistence.

### Data Fetching
TanStack Query manages all server state with automatic caching, revalidation, and optimistic updates. Mutations invalidate related queries to keep UI in sync.

### Form Handling
All forms use React Hook Form with Zod schemas for type-safe validation. Validation happens on both client (immediate feedback) and server (security).

## Important Conventions

### TypeScript
- Strict mode enabled - no implicit `any`, strict null checks
- All API responses must be typed
- Prefer interfaces over types for object shapes
- Use `unknown` instead of `any` when type is truly unknown

### React Patterns
- Functional components with hooks only (no class components)
- `useCallback` for functions passed to child components
- `useMemo` for expensive computations
- Proper dependency arrays in `useEffect` and `useCallback`

### Async Operations
- All API calls use async/await with proper error handling
- Loading and error states managed via TanStack Query
- Optimistic updates for better UX on mutations

### Security Considerations
- All user input must be sanitized before display
- BFF routes handle authentication and authorization
- Sensitive data never stored in localStorage (use httpOnly cookies)
- CSRF protection on state-changing operations

## Code Examples

### Form Pattern (useForm + Zod)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  description: z.string().max(500),
});

type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", description: "" },
});
```

Reference: `src/components/pages/projects/create-project-dialog.tsx`

### Mutation Pattern (useMutation + query invalidation)

```tsx
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (data: CreateInput) => apiPost<Project>("/projects", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    addToast({ title: "Created successfully" });
    reset();
  },
  onError: (error: Error) => {
    addToast({ title: "Failed", description: error.message, variant: "destructive" });
  },
});
```

Reference: `src/components/pages/projects/create-project-dialog.tsx`

### API Call Pattern (typed helpers)

```tsx
import { apiGet, apiPost, apiPatch } from "@/lib/requests";

// GET with typed response
const data = await apiGet<DashboardStats>("/analytics/dashboard");

// POST with typed body and response
const project = await apiPost<Project>("/projects", { name, description });

// PATCH with typed body and response
const updated = await apiPatch<Project>(`/projects/${id}`, { name });
```

Reference: `src/lib/requests.ts`

### Query Pattern (useQuery with typed response)

```tsx
const { data: stats, isLoading } = useQuery({
  queryKey: ["dashboard-stats"],
  queryFn: () => apiGet<DashboardStats>("/analytics/dashboard"),
  staleTime: 60_000,
});
```

Reference: `src/components/pages/dashboard/dashboard-page.tsx`

## Common Anti-Patterns

These are patterns that should be flagged during code review:

- **Manual `useState` for form fields** — Use React Hook Form + Zod instead
- **`dangerouslySetInnerHTML` without DOMPurify** — Always sanitize HTML
- **`any` types with eslint-disable** — Use proper typing or `unknown`
- **Mutating React state directly** — e.g., `array.splice()` or `array.push()` on state; always create new references
- **Array index as React key on dynamic lists** — Use stable IDs on lists that can be filtered, sorted, or reordered
- **Full lodash import** — Use specific subpath imports (e.g., `lodash/debounce`)
- **Storing tokens/secrets in localStorage** — Use httpOnly cookies
- **Unvalidated redirect URLs from query params** — Must validate before redirecting
- **Stale closures** — Incorrect `useCallback`/`useEffect` dependency arrays that capture stale values

## Security Checklist

- Validate redirect URLs: must start with `/`, must not start with `//`
- Never display full API secrets; show prefix only after creation
- Use DOMPurify for any HTML rendering via `dangerouslySetInnerHTML`
- BFF routes must validate auth tokens on every request
- Sanitize all user input before display to prevent XSS
- Never include sensitive data in URL query parameters

## Testing Conventions

- Tests live in the `tests/` directory at the project root
- Naming convention: `{module}.test.ts`
- Structure: `describe`/`it` blocks with Jest matchers
- Pure utility functions should have tests; components don't require tests
- Reference files: `tests/auth.test.ts`, `tests/utils.test.ts`
