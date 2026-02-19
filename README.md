# TeamHub Frontend

A modern project management dashboard built with Next.js 14, TypeScript, and Tailwind CSS. TeamHub helps teams organize projects, track tasks, manage members, and view analytics in a clean, responsive interface.

## Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State/Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Internationalization**: next-i18next
- **Testing**: Jest + React Testing Library

## Project Structure

```
src/
  components/
    layout/          # Sidebar, AppLayout
    pages/           # Feature pages (dashboard, projects, tasks, members)
    ui/              # Reusable UI primitives (button, input, table, dialog, etc.)
  hooks/             # useAuth, useCurrentOrg
  lib/               # Utils, constants, auth, API request helpers
  pages/             # Next.js pages + BFF API routes
  types/             # Shared TypeScript type definitions
  i18n/              # Translation files
tests/               # Jest test suites
```

## Getting Started

```bash
npm install
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build
npm test          # Run test suite
npm run lint      # ESLint
```

## BFF API Routes

The frontend includes Backend-for-Frontend API routes under `src/pages/api/` that proxy requests to the backend service:

| Route | Description |
|-------|-------------|
| `/api/projects/*` | Project CRUD and archival |
| `/api/tasks/*` | Task management and status updates |
| `/api/members/*` | Member listing and invitations |
| `/api/analytics/*` | Dashboard statistics |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_APP_ENV` | App environment | `development` |

## Code Review with Claude Code

This repository uses Claude Code for AI-powered code reviews.

### Prerequisites
Install Claude Code: https://code.claude.com

### Running a Review

```bash
# Navigate to repo root
cd teamhub-frontend-claude-code

# Start Claude Code
claude

# Run review on current changes or PR
/review-small        # Quick 2-agent review for small changes
/review-changes      # Comprehensive 7-agent review for complex changes
/re-review          # Verify fixes after initial review
```

### Review Skills

- **`/review-small`**: Streamlined 2-agent review (bug detection + CLAUDE.md compliance)
  - Best for: Simple bug fixes, small features, documentation updates
  - Agents: Bug detector + compliance checker

- **`/review-changes`**: Comprehensive 7-agent review
  - Best for: Complex features, architectural changes, security-sensitive code
  - Agents: CLAUDE.md compliance (2x), bug detection (2x), plan compliance, comment quality, test coverage

- **`/re-review`**: Follow-up verification
  - Best for: After fixing issues from initial review
  - Validates fixes and scans for regressions

See `.claude/skills/README.md` for detailed skill documentation.

### Understanding Review Output

Claude categorizes issues by severity:
- **Critical**: Security vulnerabilities, data loss risks
- **High**: Logic bugs that break functionality, performance bottlenecks
- **Medium**: Maintainability concerns, code quality issues
- **Low**: Style suggestions, minor improvements

See `CLAUDE.md` for project architecture and patterns Claude uses for context.

## Contributing

1. Create a feature branch from `main`
2. Make your changes and ensure tests pass (`npm test`)
3. Ensure the build succeeds (`npm run build`)
4. Open a pull request

