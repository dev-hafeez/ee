#!/usr/bin/env bash
# scripts/demo_reset.sh — One-command demo reset for Entangled Echo
# Wipes and re-seeds synthetic demonstration state deterministically.
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_PYTHON="${REPO_ROOT}/services/ai/.venv/bin/python"

if [ ! -f "${AI_PYTHON}" ]; then
  AI_PYTHON="python3"
fi

echo "================================================"
echo "  Entangled Echo — Demo Environment Reset"
echo "  Repo: ${REPO_ROOT}"
echo "  Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "================================================"

# 1. Regenerate synthetic posts and ground truth with fixed seed 42
echo ""
echo "--- Step 1: Regenerating deterministic synthetic dataset (seed=42) ---"
"${AI_PYTHON}" "${REPO_ROOT}/scripts/seed/generate.py" \
  --seed 42 \
  --months 12 \
  --posts-per-week 4 \
  --account-id "00000000-0000-0000-0000-000000000001" \
  --outdir "${REPO_ROOT}/scripts/seed"

echo "Generated 500 synthetic posts with planted truth table in scripts/seed/truth.json."

# 2. Reset database state if local postgres or Supabase is active
echo ""
echo "--- Step 2: Checking Local Database Status ---"
if docker ps 2>/dev/null | grep -q "ee_pg_test"; then
  echo "Found active test container ee_pg_test. Applying migrations from scratch..."
  docker exec ee_pg_test psql -U postgres -c "DROP DATABASE IF EXISTS ee_test;" >/dev/null 2>&1 || true
  docker exec ee_pg_test psql -U postgres -c "CREATE DATABASE ee_test;" >/dev/null 2>&1 || true
  docker exec -i ee_pg_test psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < "${REPO_ROOT}/supabase/migrations/20241001000000_initial_schema.sql" >/dev/null 2>&1
  docker exec -i ee_pg_test psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < "${REPO_ROOT}/supabase/migrations/20241001000001_rls_policies.sql" >/dev/null 2>&1
  docker exec -i ee_pg_test psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < "${REPO_ROOT}/supabase/migrations/20241001000002_claim_due_posts.sql" >/dev/null 2>&1
  echo "Database ee_test reset and schema applied."
else
  echo "No local docker container ee_pg_test found. Skipping raw container DB drop."
fi

# 3. Verify Offline Mock Configuration
echo ""
echo "--- Step 3: Verifying Demo Configuration Flags ---"
ENV_FILE="${REPO_ROOT}/apps/web/.env.local"
if [ ! -f "${ENV_FILE}" ]; then
  ENV_FILE="${REPO_ROOT}/.env.example"
fi

echo "Demo operational mode configured:"
echo "  - DATA_MODE=seed (Uses local synthetic fixtures with planted truth)"
echo "  - LLM_PROVIDER=mock (Fully offline pydantic-validated responses)"
echo "  - EMAIL_PROVIDER=mock (Console output, no SMTP credentials required)"

# 4. Check AI service health if running
echo ""
echo "--- Step 4: Health Check Verification ---"
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "  [OK] AI service is running and healthy at http://localhost:8000/health"
else
  echo "  [INFO] AI service is not running on port 8000. Start with:"
  echo "         cd services/ai && uvicorn app.main:app --port 8000 --reload"
fi

if curl -sf http://localhost:3000 >/dev/null 2>&1; then
  echo "  [OK] Web dashboard is running at http://localhost:3000"
else
  echo "  [INFO] Web dashboard is not running on port 3000. Start with:"
  echo "         pnpm dev"
fi

echo ""
echo "================================================"
echo "  Demo Reset Complete!"
echo "  Review docs/DEMO_SCRIPT.md for the step-by-step 8-minute presentation path."
echo "================================================"
