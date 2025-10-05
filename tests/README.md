# StatEnv Tests

Basic integration tests for the StatEnv Worker.

## Running Tests

### Install Dependencies

```bash
pnpm install
```

### Run All Tests

```bash
pnpm test
```

### Watch Mode (for development)

```bash
pnpm run test:watch
```

## Test Coverage

### ✅ Origin Validation

- Blocks unauthorized origins (403)
- Allows authorized origins
- Validates origin headers

### ✅ Route Validation

- Invalid routes return 404
- Unknown apps return 404
- Unknown API endpoints return 404
- Proper error messages

### ✅ Rate Limiting

- Enforces max requests per window (100/min)
- Returns 429 after limit exceeded
- Includes rate limit headers
- Returns Retry-After header on 429

### ✅ CORS

- Handles OPTIONS preflight requests
- Returns proper CORS headers
- Supports GET and POST methods

### ✅ Response Headers

- Includes StatEnv metadata (X-StatEnv-App, X-StatEnv-API)
- Includes cache headers (Cache-Control, X-Cache)
- Includes rate limit headers (X-RateLimit-\*)

### ✅ Error Handling

- Returns proper error JSON format
- Handles missing secrets gracefully
- Returns appropriate status codes

## Test Structure

```
tests/
└── worker.test.js    # Main integration tests
```

## Writing New Tests

```js
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', async () => {
    const response = await worker.fetch('/myblog/weather?q=London', {
      headers: { Origin: 'http://localhost:5500' },
    });

    expect(response.status).toBe(200);
  });
});
```

## Notes

- Tests use `unstable_dev` from Wrangler to run a local Worker instance
- Test secrets are injected via `vars` configuration
- External API calls will fail (502/504) but tests focus on Worker logic
- Rate limiting tests verify behavior, not exact count (timing-dependent)

## CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
```

## Troubleshooting

### Tests Hang

- Check if Worker port (8787) is already in use
- Kill any running `wrangler dev` processes

### Rate Limit Tests Fail

- Rate limits use in-memory storage
- Tests run fast, may hit limits in unexpected order
- Tests verify behavior exists, not exact count

### External API Errors

- Expected! Tests don't call real external APIs
- Focus on Worker logic (origin, rate limit, routing)
- Mock external APIs if needed (future enhancement)
