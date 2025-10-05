/**
 * StatEnv - Secure API Proxy for Static Apps
 * 
 * Proxies API requests with secrets that never leave the Worker
 * Your static apps call the Worker, Worker calls external APIs with secrets
 * Secrets are never exposed to the browser - actually secure!
 */

// Rate Limiting Configuration
const RATE_LIMIT = {
  maxRequests: 100,      // Maximum requests per window
  windowMs: 60000,       // Time window in milliseconds (1 minute)
  perIP: true,           // Rate limit per IP address
  perApp: false          // Rate limit per app (if true, limits apply to entire app)
};

// In-memory rate limit storage
// Note: Resets when Worker restarts, but good enough for most use cases
const rateLimitStore = new Map();

// App Configuration
// Define API endpoints that this Worker will proxy
const APP_CONFIG = {
  myblog: {
    origins: ['http://localhost:5500'],
    apis: {
      weather: {
        url: 'https://api.weatherapi.com/v1/current.json',
        secret: 'MYBLOG_WEATHER_KEY',
        method: 'GET',
        params: ['q'],  // Allowed query params
        cache: 300  // Cache for 5 minutes
      },
      analytics: {
        url: 'https://api.example.com/track',
        secret: 'MYBLOG_ANALYTICS_KEY',
        method: 'POST',
        bodyFields: ['event', 'data']  // Allowed body fields
      }
    }
  },
  myshop: {
    origins: ['https://shop.com', 'http://localhost:8080'],
    apis: {
      stripe: {
        url: 'https://api.stripe.com/v1/payment_intents',
        secret: 'MYSHOP_STRIPE_KEY',
        method: 'POST',
        bodyFields: ['amount', 'currency']
      }
    }
  }
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Route: /{appName}/{apiName}
      if (pathParts.length < 2) {
        return jsonResponse({ 
          error: 'Invalid route. Use /{appName}/{apiName}',
          example: '/myblog/weather?q=London'
        }, 404);
      }

      const [appName, apiName] = pathParts;

      // Validate app exists
      const appConfig = APP_CONFIG[appName];
      if (!appConfig) {
        return jsonResponse({ 
          error: 'Unknown app',
          availableApps: Object.keys(APP_CONFIG)
        }, 404);
      }

      // Validate API exists
      const apiConfig = appConfig.apis[apiName];
      if (!apiConfig) {
        return jsonResponse({ 
          error: 'Unknown API endpoint',
          availableApis: Object.keys(appConfig.apis)
        }, 404);
      }

      // Validate origin
      const origin = request.headers.get('Origin') || '';
      const referer = request.headers.get('Referer') || '';
      
      const isAllowed = appConfig.origins.some(allowed => 
        origin.startsWith(allowed) || referer.startsWith(allowed)
      );

      if (!isAllowed) {
        console.log(`Blocked request from origin: ${origin || referer}`);
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Rate limiting
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateLimitKey = RATE_LIMIT.perIP ? clientIP : appName;
      const rateLimit = checkRateLimit(rateLimitKey);
      
      if (!rateLimit.allowed) {
        const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        console.log(`Rate limit exceeded for ${rateLimitKey}`);
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Access-Control-Allow-Origin': origin || '*'
          }
        });
      }

      // Check cache first (if caching is enabled for this API)
      if (apiConfig.cache) {
        const cache = caches.default;
        const cacheKey = new Request(request.url, request);
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse) {
          console.log(`Cache HIT for ${appName}/${apiName}`);
          // Add rate limit headers to cached response
          const response = new Response(cachedResponse.body, cachedResponse);
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('X-RateLimit-Limit', RATE_LIMIT.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
          response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toString());
          return addCORSHeaders(response, origin);
        }
        console.log(`Cache MISS for ${appName}/${apiName}`);
      }

      // Get the secret for this API
      const secretValue = env[apiConfig.secret];
      if (!secretValue) {
        console.error(`Secret ${apiConfig.secret} not found`);
        return jsonResponse({ error: 'Configuration error' }, 500);
      }

      // Build the API request
      const proxyUrl = new URL(apiConfig.url);
      
      // Handle GET requests with query params
      if (apiConfig.method === 'GET' && apiConfig.params) {
        // Add key parameter (common for API keys)
        proxyUrl.searchParams.set('key', secretValue);
        
        // Add allowed params from client request
        for (const param of apiConfig.params) {
          const value = url.searchParams.get(param);
          if (value) {
            proxyUrl.searchParams.set(param, value);
          }
        }
      }

      // Make the proxied request with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const proxyOptions = {
        method: apiConfig.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StatEnv-Proxy/1.0'
        },
        signal: controller.signal
      };

      // Handle POST requests with body
      if (apiConfig.method === 'POST' && apiConfig.bodyFields) {
        const clientBody = await request.json().catch(() => ({}));
        const allowedBody = {};
        
        // Only pass whitelisted fields
        for (const field of apiConfig.bodyFields) {
          if (field in clientBody) {
            allowedBody[field] = clientBody[field];
          }
        }
        
        // Add secret to body or headers based on API
        allowedBody.key = secretValue;
        proxyOptions.body = JSON.stringify(allowedBody);
      }

      // Call the real API
      try {
        const apiResponse = await fetch(proxyUrl.toString(), proxyOptions);
        clearTimeout(timeout); // Clear timeout on success
        const apiData = await apiResponse.text();

      // Create the response with caching and rate limit info
      const response = new Response(apiData, {
        status: apiResponse.status,
        headers: {
          'Content-Type': apiResponse.headers.get('Content-Type') || 'application/json',
          'Cache-Control': apiConfig.cache ? `public, max-age=${apiConfig.cache}` : 'no-cache',
          'X-StatEnv-App': appName,
          'X-StatEnv-API': apiName,
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          'X-Cache': 'MISS'
        }
      });

        // Store in cache for future requests (if caching enabled)
        if (apiConfig.cache && apiResponse.ok) {
          const cache = caches.default;
          const cacheKey = new Request(request.url, request);
          // Clone response before caching (response body can only be read once)
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return addCORSHeaders(response, origin);
      } catch (fetchError) {
        clearTimeout(timeout);
        
        // Handle timeout specifically
        if (fetchError.name === 'AbortError') {
          console.error(`Timeout calling ${appName}/${apiName}`);
          return jsonResponse(
            { error: 'Gateway Timeout', message: 'External API took too long to respond' },
            504
          );
        }
        
        // Handle other fetch errors
        console.error(`Fetch error for ${appName}/${apiName}:`, fetchError.message);
        return jsonResponse(
          { error: 'Bad Gateway', message: 'Failed to reach external API' },
          502
        );
      }

    } catch (error) {
      console.error('Worker error:', error.message, error.stack);
      return jsonResponse(
        { error: 'Internal server error', message: error.message },
        500
      );
    }
  }
};

/**
 * Handle CORS preflight requests
 */
function handleCORS(request) {
  const origin = request.headers.get('Origin') || '*';
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response, origin) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', origin || '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return newResponse;
}

/**
 * Create JSON response with proper headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Check rate limit for a given identifier (IP or app)
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const key = identifier;
  
  // Clean up expired entries periodically (every ~100 requests)
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  // Get or create rate limit data
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT.windowMs
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1,
      resetAt: now + RATE_LIMIT.windowMs
    };
  }
  
  const data = rateLimitStore.get(key);
  
  // Reset if window expired
  if (now > data.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT.windowMs
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1,
      resetAt: now + RATE_LIMIT.windowMs
    };
  }
  
  // Check if limit exceeded
  if (data.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt
    };
  }
  
  // Increment and allow
  data.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - data.count,
    resetAt: data.resetAt
  };
}
