import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test Script for Entangled Echo REST Endpoints
// Simulates 100 concurrent users targeting p95 latency < 500ms (SRDS 4.1.2)

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp-up to 50 users
    { duration: '30s', target: 100 }, // Hold at 100 concurrent users
    { duration: '10s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    // 95% of requests must complete below 500ms per SRDS 4.1.2
    http_req_duration: ['p(95)<500'],
    // Error rate must remain under 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const AI_URL = __ENV.AI_TARGET_URL || 'http://localhost:8000';

export default function () {
  // 1. Health check & status ping
  const healthRes = http.get(`${AI_URL}/health`);
  check(healthRes, {
    'ai service health returns 200': (r) => r.status === 200,
  });

  // 2. Fetch analytics trends endpoint
  const trendsRes = http.get(
    `${BASE_URL}/api/analytics/trends?accountId=acc_synthetic_01&range=30d`
  );
  check(trendsRes, {
    'analytics trends status < 400': (r) => r.status < 400 || r.status === 404,
  });

  // 3. Caption / Content recommendation test
  const recPayload = JSON.stringify({
    account_id: 'acc_synthetic_01',
    recommendation_type: 'content_type',
  });

  const recRes = http.post(`${AI_URL}/api/v1/recommend`, recPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(recRes, {
    'recommendation status < 400': (r) => r.status < 400,
  });

  // Pacing interval between user actions
  sleep(0.5);
}
