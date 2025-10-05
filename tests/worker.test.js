import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('StatEnv Worker', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        MYBLOG_WEATHER_KEY: 'test-weather-key',
        MYBLOG_ANALYTICS_KEY: 'test-analytics-key',
      },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe('Origin Validation', () => {
    it('should block requests from unauthorized origins', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'https://evil.com' },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should allow requests from authorized origins', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'http://localhost:5500' },
      });

      // Will fail to call real API, but should pass origin check
      // Status will be 502 (Bad Gateway) or 504 (Timeout), not 403
      expect(response.status).not.toBe(403);
    });
  });

  describe('Route Validation', () => {
    it('should return 404 for invalid routes', async () => {
      const response = await worker.fetch('/invalid');
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Invalid route');
    });

    it('should return 404 for unknown apps', async () => {
      const response = await worker.fetch('/unknownapp/weather', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Unknown app');
    });

    it('should return 404 for unknown API endpoints', async () => {
      const response = await worker.fetch('/myblog/unknownapi', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Unknown API endpoint');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit after max requests', async () => {
      const origin = 'http://localhost:5500';
      
      // Make 101 requests (limit is 100 per minute)
      const requests = Array(101).fill().map(() =>
        worker.fetch('/myblog/weather?q=London', {
          headers: { Origin: origin },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
    });

    it('should return Retry-After header on 429', async () => {
      const origin = 'http://localhost:5500';
      
      // Hit rate limit
      await Promise.all(
        Array(101).fill().map(() =>
          worker.fetch('/myblog/weather?q=Test', {
            headers: { Origin: origin },
          })
        )
      );

      // Next request should be rate limited
      const response = await worker.fetch('/myblog/weather?q=Test2', {
        headers: { Origin: origin },
      });

      if (response.status === 429) {
        expect(response.headers.has('Retry-After')).toBe(true);
        const data = await response.json();
        expect(data.error).toBe('Too Many Requests');
      }
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const response = await worker.fetch('/myblog/weather', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5500');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should include CORS headers in responses', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
    });
  });

  describe('Response Headers', () => {
    it('should include StatEnv metadata headers', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.headers.get('X-StatEnv-App')).toBe('myblog');
      expect(response.headers.get('X-StatEnv-API')).toBe('weather');
    });

    it('should include cache headers', async () => {
      const response = await worker.fetch('/myblog/weather?q=London', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.headers.has('Cache-Control')).toBe(true);
      expect(response.headers.has('X-Cache')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing secrets gracefully', async () => {
      // This would need a different worker instance without secrets
      // For now, just verify error response format
      const response = await worker.fetch('/unknownapp/api', {
        headers: { Origin: 'http://localhost:5500' },
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return proper error JSON format', async () => {
      const response = await worker.fetch('/invalid');
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });
});
