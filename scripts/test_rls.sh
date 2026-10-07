#!/usr/bin/env bash
set -eo pipefail

CONTAINER_NAME="ee_pg_test"

echo "=== Entangled Echo: Running Schema & RLS Test Suite ==="

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Starting test postgres container..."
  docker run -d --rm --name "$CONTAINER_NAME" -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16-alpine
  sleep 3
fi

# Wait for ready
until docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for postgres to be ready..."
  sleep 1
done

# Reset test database to test applying migrations from scratch
echo "0. Resetting clean test database..."
docker exec "$CONTAINER_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS ee_test;"
docker exec "$CONTAINER_NAME" psql -U postgres -c "CREATE DATABASE ee_test;"

echo "1. Applying initial schema migration..."
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < supabase/migrations/20241001000000_initial_schema.sql

echo "2. Applying RLS policies migration..."
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < supabase/migrations/20241001000001_rls_policies.sql

echo "3. Running RLS multi-tenant isolation tests..."
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d ee_test < supabase/tests/rls_test.sql

echo "=== ALL MIGRATIONS AND RLS TESTS PASSED SUCCESSFULLY! ==="
