# TeamHub Frontend — Code Review Rules

These rules augment CLAUDE.md with review-specific guidance. Apply these checks
to every pull request in addition to the general conventions.

---

## React & Hooks

- **Dependency arrays**: Every `useEffect`, `useCallback`, and `useMemo` must
  have a complete and correct dependency array. Missing dependencies cause stale
  closures; unnecessary dependencies cause performance regressions.
- **No direct state mutation**: State arrays and objects must never be mutated
  in place (no `array.push()`, `array.splice()`, `object.key = value` on state).
  Always produce new references.
- **Stable list keys**: React `key` props on dynamic lists must use stable IDs
  (e.g., `item.id`). Array index as key is only acceptable for static,
  never-reordered lists.
- **Functional components only**: No class components. All components must be
  functional with hooks.
- **`useCallback` for child callbacks**: Functions passed as props to child
  components should be wrapped in `useCallback` to avoid unnecessary re-renders.

## Data Fetching (TanStack Query)

- **Query key specificity**: Query keys must be specific enough to avoid
  over-invalidation. A key of `["projects"]` is appropriate when the full list
  is needed; `["projects", projectId]` when fetching a single item.
- **Mutations must invalidate**: Every `useMutation` `onSuccess` handler must
  call `queryClient.invalidateQueries` on all related query keys. Forgetting
  invalidation causes stale UI state.
- **`isError` handling required**: `useQuery` hooks must handle the `isError`
  state. Rendering "no data" when a fetch has silently failed is a bug — the
  user sees empty state instead of an error message.
- **Optimistic updates**: When a mutation's result is predictable (e.g., status
  toggle), prefer optimistic updates via `onMutate` / `onError` rollback over
  waiting for server confirmation.
- **`staleTime`**: Add `staleTime` to queries for data that doesn't change
  frequently. Omitting it causes unnecessary refetches on window focus.

## Forms (React Hook Form + Zod)

- **Zod schema validation**: All forms must use a Zod schema with
  `zodResolver`. Manual validation logic in submit handlers is not acceptable.
- **`useForm` only**: Form field state must be managed by React Hook Form.
  Manual `useState` for form fields is an anti-pattern in this codebase.
- **Error display**: All form fields must display Zod validation errors via
  `formState.errors`. Silently ignoring validation failures degrades UX.
- **Reset on success**: Form state should be reset (`reset()`) after a
  successful mutation to prevent stale input values.

## TypeScript

- **No `any` or `as any`**: Use `unknown` when the type is genuinely unknown,
  then narrow it. `any` disables type checking and must not appear in new code.
- **Type all API responses**: Every `apiGet`, `apiPost`, `apiPatch`, `apiDelete`
  call must have a typed generic parameter (e.g., `apiGet<Project[]>(...)`).
  Untyped calls return `unknown` and defeat type safety.
- **Interfaces for object shapes**: Prefer `interface` over `type` for object
  shapes, as documented in CLAUDE.md.
- **Discriminated unions for state**: When a value can be in multiple states
  (e.g., `loading | success | error`), model it as a discriminated union rather
  than multiple boolean flags.

## Security

- **User input display**: Any user-generated content rendered to the DOM must
  be sanitized before display. This is especially important for string fields
  from API responses that may contain HTML.
- **`dangerouslySetInnerHTML`**: Requires explicit client-side sanitization.
  Relying solely on server-side sanitization is insufficient — defense-in-depth
  is required.
- **Auth token handling**: Tokens and secrets must not be stored in
  `localStorage`. The BFF layer handles authentication via server-side
  mechanisms. Client code should not manage raw tokens.
- **Redirect URL validation**: Any URL taken from query parameters and used in
  `router.push()` or similar must be validated to ensure it is a relative path.
  This prevents open redirect vulnerabilities.
- **API key / secret display**: API secrets must not be rendered in the UI for
  existing keys. Only a prefix or masked representation should be shown. The
  full secret may be shown once immediately after creation.

## BFF API Routes

- **Auth token propagation**: Every BFF route must forward the auth token from
  the incoming request to the backend. Never forward the raw client cookie or
  header unvalidated.
- **No business logic in BFF routes**: BFF routes proxy requests and handle
  auth. Business logic belongs in the backend API.
- **Error passthrough**: BFF routes must propagate backend error status codes
  and messages to the client. Swallowing backend errors and returning 500 hides
  the real failure reason.

## Component Conventions

- **UI primitives from `/components/ui/`**: Use the project's shared UI
  components (`Button`, `Input`, `Dialog`, `Select`, `Badge`, etc.) rather than
  raw HTML elements. Inline `<button>` or `<select>` bypasses the design system.
- **`window.confirm`**: Do not use `window.confirm` for destructive action
  confirmation. Use the `Dialog` component for consistent UX.
- **Async clipboard**: `navigator.clipboard.writeText()` returns a Promise and
  can fail (permission denied, insecure context, unfocused document). Always
  `await` it and handle the error case with a toast.
- **Loading and disabled states**: Buttons that trigger mutations must show a
  loading state and be `disabled` while the mutation is in flight to prevent
  double-submission.

## Testing

- **Pure utility functions must have tests**: Functions in `src/lib/` that
  contain non-trivial logic should have corresponding tests in `tests/`.
- **Test data must match implementation**: Mock data in test files must exactly
  match the mock data in the implementation they test. Mismatched test data
  produces false-passing tests.
- **No implementation details in tests**: Test observable behavior, not internal
  state. Avoid testing that a specific function was called unless testing a
  side effect.

## False Positives to Avoid

- Pre-existing code not modified in the PR is out of scope.
- Next.js-specific patterns (e.g., `_app.tsx`, `getServerSideProps`) have
  different conventions from client components — do not apply client rules to
  server-side code.
- Tailwind class ordering is handled by tooling; do not flag class order.
- `// eslint-disable` comments with a documented reason are intentional.
