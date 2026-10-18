# Coding Conventions, Standards & Guidelines

## 1. Language Standards & Types

### TypeScript (`apps/web`)
- **Strict Mode**: Enabled (`"strict": true` in `tsconfig.json`).
- **Typing Integrity**: Explicit types on function arguments, return values, and Server Action payloads. Avoid `any`; use typed generics or `unknown` with type guards.
- **Null Safety**: Always handle nullable database fields (e.g. `reach`, `perf_score`, `last_sync`) with fallback operators (`??` or `|| 0`).
- **Path Aliases**: Use `@/*` pointing to `src/*` (e.g., `import { createClient } from '@/lib/supabase/server'`).

### Python (`services/ai`)
- **Python Version**: Python 3.12+ features (type unions `X | Y`, structural pattern matching).
- **Type Annotations**: Comprehensive type hinting across all module functions and class methods.
- **Pydantic v2**: All API request bodies, query parameters, and responses are declared as `pydantic.BaseModel` subclasses with field validations and examples.
- **Settings Management**: `pydantic_settings.BaseSettings` with strict `.env` loading and zero hardcoded URLs/secrets.

---

## 2. Naming Conventions

| Entity | Convention | Example |
| :--- | :--- | :--- |
| **React Components** | PascalCase | `Sidebar.tsx`, `AnalyticsClient.tsx`, `TopBar.tsx` |
| **Server Actions** | camelCase with `Action` suffix | `runQuboOptimizerAction`, `createScheduledPostAction` |
| **TypeScript Functions/Vars** | camelCase | `getCachedAuthUser`, `formatDate`, `totalReach` |
| **TypeScript Types/Interfaces** | PascalCase | `SocialProvider`, `ScheduledPost`, `CachedProfile` |
| **Python Modules & Files** | snake_case | `analyzer.py`, `qubo.py`, `validator.py` |
| **Python Classes** | PascalCase | `SimulatedAnnealingOptimizer`, `UnseenNumbersValidator` |
| **Python Functions/Vars** | snake_case | `solve_qubo`, `extract_topics`, `perf_score` |
| **Database Tables & Columns** | snake_case | `social_accounts`, `engagement_metrics`, `perf_score` |
| **Environment Variables** | UPPER_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL`, `TOKEN_ENC_KEY` |
| **REST Endpoints** | lowercase / kebab-case | `/api/v1/analyze`, `/api/internal/tick` |

---

## 3. Formatting & Code Style

- **Prettier** (`.prettierrc.json`):
  - Single quotes (`"singleQuote": true`)
  - 2-space indentation (`"tabWidth": 2`)
  - 100 character print width (`"printWidth": 100`)
  - Semicolons required (`"semi": true`)
  - Tailwind class sorting enforced via `prettier-plugin-tailwindcss`
- **Ruff** (`pyproject.toml`):
  - Line length: 100 characters
  - Enforces PEP 8, import sorting (isort), and flake8 rules
- **ESLint** (`eslint.config.mjs`):
  - Next.js Core Web Vitals rules + TypeScript recommended rules

---

## 4. Architectural Patterns & Best Practices

### React Server Components (RSC) vs Client Components
1. **Server Components by Default**:
   - Layouts (`layout.tsx`) and Pages (`page.tsx`) are Server Components.
   - Fetch data directly using `createClient()` from `@/lib/supabase/server` or cached helpers.
   - Keep async data fetching on the server to prevent exposing database credentials and to minimize client bundle sizes.
2. **Client Components (`'use client'`)**:
   - Restricted strictly to interactive leaf nodes (e.g. `AnalyticsClient.tsx`, `CalendarClient.tsx`, modals, tabs).
   - Pass data from Server Component to Client Component as typed props.
3. **Server Actions (`'use server'`)**:
   - Encapsulate all database mutations, external provider calls, and AI dispatchers into dedicated action files (e.g. `recommendation-actions.ts`, `calendar-actions.ts`).
   - Validate authorization inside each action before proceeding.

### Request Deduplication & Fast Navigation
- Wrap multi-component session queries in React `cache()` (`apps/web/src/lib/supabase/cached.ts`):
  ```typescript
  export const getCachedAuthUser = cache(async () => { ... });
  export const getCachedProfile = cache(async (userId: string) => { ... });
  ```
- Use `loading.tsx` in route folders to provide instant feedback while dynamic data resolves.
- Add `prefetch={true}` on high-priority navigation links in `Sidebar.tsx`.

---

## 5. Security & Operational Rules

1. **Zero Secrets in Client**:
   - Only variables prefixed with `NEXT_PUBLIC_` may enter the browser bundle.
   - All social API keys, LLM keys, encryption keys, and service role keys are strictly server-side.
2. **Offline-First Resilience**:
   - Every external service must provide a functional `mock` or `seed` mode.
   - In `DATA_MODE=seed|mock`, the app runs completely without live external APIs.
3. **Data Integrity & Honesty**:
   - Never fabricate or hardcode fake metrics in UI components.
   - Always label synthetic accounts (`social_accounts.is_synthetic`) with a visible `"Demo data"` badge.
   - Captions and AI suggestions must clearly indicate their source (`"Gemini"`, `"Anthropic"`, `"Mock"`, or `"Fallback template"`).
