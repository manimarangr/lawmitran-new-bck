// LawMitran load test — validates the ~10k-concurrent target from docs/19-scalability.md.
//
// Models realistic traffic: ~95% reads (search, profile, document browse) and ~5% writes
// (signup + OTP, lead submission). Uses ramping VUs to approximate concurrent users and
// per-iteration think time so VUs ≈ concurrent users (not raw RPS).
//
// Run:
//   BASE_URL=http://localhost:8080 k6 run loadtest/k6-lawmitran.js
//   # full 10k target (needs a beefy load generator / k6 Cloud):
//   BASE_URL=https://staging.lawmitran.com TARGET=10000 k6 run loadtest/k6-lawmitran.js
//
// Tunables via env: BASE_URL, TARGET (peak VUs), DURATION_RAMP, DURATION_HOLD.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const TARGET = parseInt(__ENV.TARGET || '2000', 10);     // peak concurrent VUs
const RAMP = __ENV.DURATION_RAMP || '2m';
const HOLD = __ENV.DURATION_HOLD || '5m';

const errorRate = new Trend('app_errors_pct');
const readFail = new Rate('read_failures');

const CITIES = ['bengaluru', 'chennai', 'mumbai', 'delhi', 'hyderabad'];
const AREAS = ['family', 'criminal', 'property', 'civil', 'corporate', 'consumer'];

export const options = {
  scenarios: {
    // ~95% of load: public reads (cacheable). VUs ≈ concurrent browsing users.
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: RAMP, target: Math.round(TARGET * 0.95) },
        { duration: HOLD, target: Math.round(TARGET * 0.95) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // ~5% of load: writes (signup+OTP, lead submission).
    act: {
      executor: 'ramping-vus',
      exec: 'act',
      startVUs: 0,
      stages: [
        { duration: RAMP, target: Math.round(TARGET * 0.05) },
        { duration: HOLD, target: Math.round(TARGET * 0.05) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Targets from the scalability doc.
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    read_failures: ['rate<0.01'],
  },
};

function ok(res) {
  const good = res.status >= 200 && res.status < 400;
  errorRate.add(good ? 0 : 100);
  return good;
}

// ---- 95%: public browsing (search → results → a profile) ----
export function browse() {
  group('search', () => {
    const city = randomItem(CITIES), area = randomItem(AREAS);
    const r = http.get(`${BASE}/api/lawyers?city=${city}&practiceArea=${area}&sort=rating&page=1&limit=20`,
      { tags: { name: 'GET /api/lawyers (search)' } });
    readFail.add(!ok(r));
    check(r, { 'search ok': (x) => x.status === 200 });
  });
  sleep(Math.random() * 3 + 2); // 2–5s think time

  group('profile', () => {
    const r = http.get(`${BASE}/api/lawyers/sample-id`, { tags: { name: 'GET /api/lawyers/:id (profile)' } });
    readFail.add(!ok(r));
  });
  sleep(Math.random() * 4 + 3); // 3–7s think time

  group('documents', () => {
    const r = http.get(`${BASE}/api/documents/templates?q=rent`, { tags: { name: 'GET /api/documents/templates' } });
    readFail.add(!ok(r));
  });
  sleep(Math.random() * 5 + 3);
}

// ---- 5%: write paths (signup + OTP, lead submission) ----
export function act() {
  const n = Math.floor(Math.random() * 1e9);
  group('signup+otp', () => {
    const reg = http.post(`${BASE}/api/auth/register`, JSON.stringify({
      email: `load_${n}@example.com`, mobile: `9${(1000000000 + n % 999999999)}`,
      password: 'LoadTest!2026', role: 'CLIENT',
    }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/register' } });
    ok(reg);
    sleep(1);
    http.post(`${BASE}/api/auth/mobile/send-otp`, JSON.stringify({ mobile: `9${(1000000000 + n % 999999999)}` }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/mobile/send-otp' } });
  });
  sleep(Math.random() * 4 + 2);

  group('submit-lead', () => {
    // In a real run, authenticate first and reuse the JWT. Here we just exercise the route.
    const lead = http.post(`${BASE}/api/leads`, JSON.stringify({
      practiceArea: randomItem(AREAS), city: randomItem(CITIES),
      description: 'Need help with a matter (load test).',
    }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/leads' } });
    ok(lead);
  });
  sleep(Math.random() * 6 + 4);
}
