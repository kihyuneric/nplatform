import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Stay at 50
    { duration: '30s', target: 100 },  // Peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% under 3s
    http_req_failed: ['rate<0.05'],     // Less than 5% errors
  },
}

const BASE = 'http://localhost:3000'

export default function () {
  // Main page
  let res = http.get(`${BASE}/`)
  check(res, { 'main 200': (r) => r.status === 200 })
  sleep(1)

  // Exchange
  res = http.get(`${BASE}/exchange`)
  check(res, { 'exchange 200': (r) => r.status === 200 })
  sleep(1)

  // API
  res = http.get(`${BASE}/api/v1/exchange/listings`)
  check(res, { 'listings API 200': (r) => r.status === 200 })
  sleep(0.5)

  // Professional
  res = http.get(`${BASE}/professional`)
  check(res, { 'professional 200': (r) => r.status === 200 })
  sleep(1)
}
