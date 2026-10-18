# Technical Concerns, Risks & Architecture Considerations

## 1. Latency & Network Round-Trips to Hosted BaaS

### Context
The PostgreSQL database is hosted on a remote Supabase instance (`fqcbhmkcannaqdwarbel.supabase.co`). A single round-trip HTTP request from a local machine or separate cloud region takes approximately **470ms**.

### Implemented Mitigations
1. **Parallelized Server Component Queries**:
   - Replaced sequential waterfalls with `Promise.all()` in `dashboard/page.tsx`, `analytics/page.tsx`, `calendar/page.tsx`, and `settings/page.tsx`.
2. **React `cache()` Deduplication**:
   - In `apps/web/src/lib/supabase/cached.ts`, `getCachedAuthUser()` and `getCachedProfile()` prevent multiple layout and page components from re-querying the same user session within a single request.
3. **Instant Loading Skeletons (`loading.tsx`)**:
   - Prevents UI freezing by immediately rendering a sleek pulse skeleton while server components execute.
4. **Client Router Cache & Link Prefetching**:
   - Configured `staleTimes: { dynamic: 30, static: 180 }` in `next.config.ts` and `prefetch={true}` on all primary navigation links in `Sidebar.tsx`.
5. **Middleware Session Check Fast-Path**:
   - Added a 60-second cached session cookie (`ee_session_check`) to prevent the middleware from making a remote database query to `profiles` on every single page transition and RSC payload request.

### Production Recommendation
Deploy the Next.js web application (e.g. on Vercel) and the FastAPI AI service (e.g. on Render/Railway/Fly.io) in the **exact same cloud region** as the Supabase PostgreSQL cluster (e.g. `us-east-1` or `eu-central-1`). This will reduce database latency from 470ms to under 15ms.

---

## 2. Meta Graph API Constraints & Live Operations

### Context
The SRDS assumes full direct access to Instagram and Facebook metrics and scheduling. However, real-world Meta Graph API rules impose strict constraints:

1. **Meta App Review & Role Limits**:
   - Live production mode requires approved Meta App Review and business verification for permissions like `instagram_basic`, `instagram_content_publish`, and `pages_read_engagement`.
   - In development mode, the app functions exclusively for Instagram/Facebook accounts that hold an explicit role (Admin, Developer, or Tester) on the Meta Developer App.
   - **Mitigation**: The architecture provides `DATA_MODE=seed` and `DATA_MODE=mock`. Demonstrations, automated evaluations, and FYP presentations run fully offline without relying on Meta review.
2. **Lack of Native Instagram Scheduling**:
   - Instagram Graph API offers no native `scheduled_publish_time` parameter. All scheduling must be held and orchestrated internally.
   - **Mitigation**: Built an internal worker at `/api/internal/tick` that queries due posts every minute using PostgreSQL `FOR UPDATE SKIP LOCKED` and publishes them at the designated time via Meta's two-step container publishing API.
3. **Competitor Data Availability**:
   - Competitor reach and impression counts are strictly private in Meta's API.
   - **Mitigation**: Competitor analytics are restricted to public metrics returned by the Business Discovery API (follower count, media count, public engagement rate), clearly documented in `docs/DEVIATIONS.md` (Decision D7).

---

## 3. Quantum-Inspired QUBO Optimization Scaling

### Context
The QUBO formulation models scheduling over a 168-variable grid ($7 \text{ days} \times 24 \text{ hours}$).

1. **Horizon Scaling**:
   - Optimizing multiple weeks across multiple platforms simultaneously would increase binary variables from 168 to $P \times W \times 168$ (e.g. 1,008 variables for 2 platforms across 3 weeks), increasing annealing search space exponentially.
   - **Mitigation**: The optimizer solves a representative 168-slot weekly template with shrinkage priors, projects the slots across the target date horizon, applies date-specific blackout constraints, and triggers a re-solve only if conflicts arise.
2. **Solver Nature & Terminology**:
   - The scheduler solves a QUBO formulation using D-Wave's classical simulated annealing sampler (`dwave-samplers`). It is mathematically compatible with quantum annealers (e.g. D-Wave Advantage) but runs classically.
   - **Guideline**: Must always be described honestly as "quantum-inspired simulated annealing", avoiding misleading claims of direct quantum execution.

---

## 4. Hosting & Long-Running Compute Processes

### Context
Next.js serverless functions (e.g. Vercel hobby tier) enforce a strict 10-second timeout limit and lack persistent Python runtimes.

1. **Microservice Isolation**:
   - The AI service cannot run as Next.js serverless functions. It requires a dedicated long-running container runtime (Docker on Render/Railway/Fly.io or VPS).
2. **Cold Starts on Free Tiers**:
   - Free container hosting tiers sleep after inactivity.
   - **Mitigation**: Added `/health` endpoint for monitoring and keep-alive pingers.

---

## 5. Next.js 16 Framework Conventions

### Context
Turbopack development logs display:
`⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

Next.js 16 is introducing a new `proxy` convention to succeed the edge `middleware.ts`. While `middleware.ts` remains fully functional in Next.js 16.4.0, future major upgrades will require running the official codemod:
```bash
npx @next/codemod@canary middleware-to-proxy .
```
All route matching and session logic should be kept cleanly modular in `apps/web/src/lib/supabase/middleware.ts` so this migration will be purely structural.
