#!/usr/bin/env bash
# scripts/eval/run_all.sh — Regenerates all numbers in docs/EVALUATION.md
# Usage: bash scripts/eval/run_all.sh [--skip-rls] [--skip-load]
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AI_PYTHON="${REPO_ROOT}/services/ai/.venv/bin/python"
AI_PYTEST="${REPO_ROOT}/services/ai/.venv/bin/pytest"

echo "================================================"
echo "  Entangled Echo — Full Evaluation Re-run"
echo "  Repo: ${REPO_ROOT}"
echo "  Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "================================================"

echo ""
echo "--- Step 1: AI Service Tests + Coverage ---"
cd "${REPO_ROOT}/services/ai"
"${AI_PYTEST}" tests/ -v --cov=app --cov-report=term-missing 2>&1 | tee /tmp/ee_ai_test_results.txt
echo "AI tests complete. Results in /tmp/ee_ai_test_results.txt"

echo ""
echo "--- Step 2: Web App Tests ---"
cd "${REPO_ROOT}"
pnpm --filter @ee/web test 2>&1 | tee /tmp/ee_web_test_results.txt
echo "Web tests complete. Results in /tmp/ee_web_test_results.txt"

echo ""
echo "--- Step 3: Benchmark Suite (optimizer + baselines + NFR) ---"
cd "${REPO_ROOT}"
"${AI_PYTHON}" scripts/evaluate_benchmarks.py 2>&1 | tee /tmp/ee_benchmark_results.txt
echo "Benchmarks complete. Results in /tmp/ee_benchmark_results.txt"
echo "JSON: scripts/seed/benchmark_results.json"

echo ""
echo "--- Step 4: RLS Isolation Tests ---"
if [[ "$*" == *"--skip-rls"* ]]; then
  echo "Skipping RLS tests (--skip-rls passed)"
else
  cd "${REPO_ROOT}"
  bash scripts/test_rls.sh 2>&1 | tee /tmp/ee_rls_results.txt
  echo "RLS tests complete. Results in /tmp/ee_rls_results.txt"
fi

echo ""
echo "--- Step 5: Secret Scan ---"
echo "Scanning source tree for raw secrets..."
if grep -rn --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" \
    -E "(sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9]{50,}|AAAA[a-zA-Z0-9]{50,})" \
    . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.next 2>/dev/null | \
    grep -v "test\|mock\|example\|placeholder" | grep -q .; then
  echo "WARNING: Potential raw secrets found — review output above"
else
  echo "PASS: No raw secrets found in source tree"
fi

echo "Scanning client bundle..."
if find apps/web/.next/static -name "*.js" 2>/dev/null | \
    xargs grep -l "SERVICE_ROLE\|TOKEN_ENC_KEY\|META_APP_SECRET\|LLM_API_KEY\|INTERNAL_TICK" 2>/dev/null | grep -q .; then
  echo "FAIL: Server secrets found in client static bundle"
else
  echo "PASS: No server secrets in client-side static bundle"
fi

echo ""
echo "--- Step 6: Hardcoded Demo Data Scan ---"
HARDCODED=$(grep -rn "|| [0-9]\{4,\}" apps/web/src/app/ --include="*.tsx" 2>/dev/null | grep -v "//\|2026\|2024\|2025\|3000\|8000" || true)
if [ -n "$HARDCODED" ]; then
  echo "FAIL: Hardcoded numbers found:"
  echo "$HARDCODED"
else
  echo "PASS: No hardcoded demo numbers found"
fi

echo ""
echo "--- Step 7: Load Test (k6) ---"
if [[ "$*" == *"--skip-load"* ]]; then
  echo "Skipping k6 load test (--skip-load passed)"
elif command -v k6 &>/dev/null; then
  echo "Running k6 load test (requires running server at localhost:3000 and :8000)..."
  k6 run "${REPO_ROOT}/tests/load/k6_load_test.js" 2>&1 | tee /tmp/ee_k6_results.txt
  echo "k6 complete. Results in /tmp/ee_k6_results.txt"
else
  echo "SKIP: k6 not installed. Install with: https://k6.io/docs/getting-started/installation"
fi

echo ""
echo "================================================"
echo "  All steps complete."
echo "  See /tmp/ee_*.txt for detailed output."
echo "  See scripts/seed/benchmark_results.json for optimizer numbers."
echo "================================================"
