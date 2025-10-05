# 🔐 StatEnv - Secure API Proxy for Static Apps

**Keep your API keys on the server where they belong!**

---

## 🎯 What Is StatEnv?

StatEnv is a **Cloudflare Worker that proxies API requests** for your static websites. Instead of exposing API keys in your frontend code (where users can extract them), the Worker keeps secrets secure and makes API calls on your behalf.

### ❌ The Problem

Traditional approaches expose secrets in the browser:

```js
// INSECURE: Anyone can steal this from DevTools!
const apiKey = 'sk_live_abc123';  
const data = await fetch(`https://api.example.com?key=${apiKey}`);
```

Even using `.env` files doesn't help - the secrets get bundled into JavaScript:

```js
// Still INSECURE: Bundled into client JavaScript!
const apiKey = import.meta.env.VITE_API_KEY; // → becomes "sk_live_abc123"
```

### ✅ The Solution

StatEnv keeps secrets on the server and proxies requests:

```js
// SECURE: API key never leaves the Worker!
const response = await fetch('https://worker.dev/myapp/weather?q=London');
const data = await response.json();
// Worker adds secret key and calls the real API
```

---

## 🚀 Quick Start

### 1. Configure API Endpoints

Edit `src/index.js` to define which APIs your apps can access:

```js
const APP_CONFIG = {
  myblog: {
    origins: ['https://myblog.com', 'http://localhost:3000'],
    apis: {
      weather: {
        url: 'https://api.weatherapi.com/v1/current.json',
        secret: 'MYBLOG_WEATHER_KEY',
        method: 'GET',
        params: ['q'],  // Allowed query params
        cache: 300      // Cache for 5 minutes
      },
      analytics: {
        url: 'https://api.example.com/track',
        secret: 'MYBLOG_ANALYTICS_KEY',
        method: 'POST',
        bodyFields: ['event', 'data']  // Allowed body fields
      }
    }
  }
};
```

### 2. Deploy the Worker

```bash
# Login to Cloudflare
wrangler login

# Set your secrets (never in code!)
wrangler secret put MYBLOG_WEATHER_KEY
wrangler secret put MYBLOG_ANALYTICS_KEY

# Deploy
wrangler deploy
```

### 3. Use in Your Static Site

Just use plain `fetch` - no library needed!

```html
<script>
  const WORKER_URL = 'https://statenv.yourname.workers.dev';
  const APP_NAME = 'myblog';
  
  // GET request
  const response = await fetch(`${WORKER_URL}/${APP_NAME}/weather?q=London`);
  const weather = await response.json();
  console.log(weather.current.temp_c);
  
  // POST request
  await fetch(`${WORKER_URL}/${APP_NAME}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'page_view',
      data: { page: '/home' }
    })
  });
</script>
```

---

## 🔒 How It Works

### Traditional Approach (INSECURE)
```
Browser → External API (with exposed secret) ❌
```
- Secrets bundled in JavaScript
- Users can extract from DevTools/localStorage
- XSS attacks can steal secrets

### StatEnv Approach (SECURE)
```
Browser → StatEnv Worker → External API (with secret) ✅
```
- Secrets stay on Cloudflare Worker
- Users never see the API keys
- Origin validation prevents abuse

### Request Flow

1. **Client calls Worker**: `env.get('weather', { q: 'London' })`
2. **Worker validates origin**: Checks if request is from allowed domain
3. **Worker adds secret**: Fetches `MYBLOG_WEATHER_KEY` from secure storage
4. **Worker calls real API**: `api.weatherapi.com?key=SECRET&q=London`
5. **Worker returns data**: Client gets response, never sees the key

---

## ✅ Benefits

### vs Traditional .env Files

| Feature | .env (Bundled) | StatEnv Proxy |
|---------|----------------|---------------|
| **Secrets in browser** | ❌ Yes (bundled) | ✅ No (server-only) |
| **Extractable by users** | ❌ Yes | ✅ No |
| **Rotate without rebuild** | ❌ No | ✅ Yes |
| **Origin validation** | ❌ No | ✅ Yes |
| **Rate limiting** | ❌ No | ✅ Yes (built-in) |
| **Edge caching** | ❌ No | ✅ Yes (global) |
| **Actually secure** | ❌ No | ✅ Yes |

### Key Advantages

- 🔒 **Actually secure** - Secrets never leave the server
- 🚫 **No DevTools exposure** - Users can't extract keys
- ⚡ **Fast** - Global edge caching reduces API calls
- 🔥 **Rate limiting** - Prevents abuse per IP or app
- 🎯 **Multi-app** - One Worker serves many static sites
- 💰 **Cost saving** - Cache reduces external API usage
- 🆓 **Free tier friendly** - Cloudflare's generous limits
- 🔄 **Easy rotation** - Update secrets without redeploying sites
- 🛡️ **Origin validation** - Only whitelisted domains can access
- 📊 **Monitorable** - Track API usage per app

---

## 📖 Configuration Guide

### App Structure

```js
const APP_CONFIG = {
  appName: {
    origins: ['https://yourdomain.com'],  // Allowed domains
    apis: {
      apiName: {
        url: 'https://api.external.com/endpoint',  // Real API URL
        secret: 'APPNAME_SECRETNAME',              // Wrangler secret name
        method: 'GET',                             // or 'POST'
        params: ['param1', 'param2'],              // Allowed query params (GET)
        bodyFields: ['field1', 'field2'],          // Allowed body fields (POST)
        cache: 300                                 // Cache seconds (optional)
      }
    }
  }
};
```

### Secret Naming Convention

Secrets follow the pattern: `{APPNAME}_{SECRETNAME}`

```bash
# For app "myblog" and secret "WEATHER_KEY"
wrangler secret put MYBLOG_WEATHER_KEY

# For app "myshop" and secret "STRIPE_KEY"
wrangler secret put MYSHOP_STRIPE_KEY
```

### GET Requests

```js
apis: {
  weather: {
    url: 'https://api.weatherapi.com/v1/current.json',
    secret: 'MYBLOG_WEATHER_KEY',
    method: 'GET',
    params: ['q', 'lang'],  // Only these params are forwarded
    cache: 300              // Cache responses for 5 minutes
  }
}
```

Client usage:
```js
await env.get('weather', { q: 'London', lang: 'en' });
// Worker calls: api.weatherapi.com?key=SECRET&q=London&lang=en
```

### POST Requests

```js
apis: {
  analytics: {
    url: 'https://api.analytics.com/track',
    secret: 'MYBLOG_ANALYTICS_KEY',
    method: 'POST',
    bodyFields: ['event', 'data', 'timestamp']  // Only these fields allowed
  }
}
```

Client usage:
```js
await env.post('analytics', {
  event: 'button_click',
  data: { button: 'signup' },
  timestamp: Date.now()
});
```

---

## 🗂️ Project Structure

```
StaticEnv/
├── README.md              ← You are here
├── LICENSE                ← Apache 2.0
├── wrangler.toml          ← Worker configuration
├── package.json           ← npm scripts
│
├── src/
│   └── index.js           ← Worker proxy code
│
├── docs/
│   ├── MONITORING.md      ← Complete monitoring guide
│   └── MONITORING_QUICK_REF.md ← Quick reference
│
├── examples/
│   └── example.html       ← Working demo
│
└── tests/
    ├── README.md          ← Test documentation
    └── worker.test.js     ← Integration tests
```

---

## 📊 Monitoring

### Real-Time Logs (Zero Overhead)

```bash
# Watch all requests in real-time
wrangler tail

# Monitor errors only
wrangler tail --status error

# Monitor cache performance
wrangler tail --search "Cache"

# Monitor rate limiting
wrangler tail --search "Rate limit"
```

**See [docs/MONITORING.md](docs/MONITORING.md) for complete guide or [docs/MONITORING_QUICK_REF.md](docs/MONITORING_QUICK_REF.md) for quick reference.**

### Cloudflare Analytics (Free)

View detailed analytics in Cloudflare Dashboard:
- Dashboard → Workers & Pages → statenv → Analytics
- Request volume, error rates, response times
- Geographic distribution, status codes

---

## 🧪 Testing

### Run Tests

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Watch mode (for development)
pnpm run test:watch
```

### Test Coverage

- ✅ Origin validation (403 for unauthorized)
- ✅ Route validation (404 for unknown)
- ✅ Rate limiting (429 after limit)
- ✅ CORS handling (OPTIONS preflight)
- ✅ Response headers (X-StatEnv-*, X-RateLimit-*)
- ✅ Error handling (proper JSON errors)

See [tests/README.md](tests/README.md) for details.

---

## 🚀 Deployment

### 1. Install Dependencies

```bash
pnpm install
# or npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Configure Your Apps

Edit `src/index.js` and define your apps and API endpoints.

### 4. Set Secrets

```bash
wrangler secret put APPNAME_SECRETNAME
# Enter the secret value when prompted
```

### 5. Deploy

```bash
pnpm run deploy
# or npm run deploy
```

### 6. Test

Visit `examples/example.html` (update the Worker URL first) to test the proxy.

---

## 💡 Usage Examples

### Weather API (GET)

```js
const WORKER_URL = 'https://statenv.me.workers.dev';
const APP_NAME = 'myblog';

// Get weather for London
const response = await fetch(`${WORKER_URL}/${APP_NAME}/weather?q=London`);
const weather = await response.json();
console.log(`${weather.location.name}: ${weather.current.temp_c}°C`);
```

### Analytics Tracking (POST)

```js
// Track page views
await fetch(`${WORKER_URL}/${APP_NAME}/analytics`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'page_view',
    data: { 
      page: window.location.pathname,
      timestamp: Date.now()
    }
  })
});
```

### Multiple APIs

```js
// Call different endpoints
const weather = await fetch(`${WORKER_URL}/${APP_NAME}/weather?q=London`)
  .then(r => r.json());
  
const forecast = await fetch(`${WORKER_URL}/${APP_NAME}/forecast?q=London&days=3`)
  .then(r => r.json());

await fetch(`${WORKER_URL}/${APP_NAME}/analytics`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ event: 'api_call' })
});
```

---

## ⚡ Performance Features

### Worker-Side Caching

Responses are cached at the edge using Cloudflare's Cache API:

```js
apis: {
  weather: {
    url: 'https://api.weatherapi.com/v1/current.json',
    cache: 300  // Cache for 5 minutes (300 seconds)
  }
}
```

**How it works:**
1. **First request**: Worker → External API → Cache + Return
2. **Subsequent requests**: Worker → Cache → Return (instant!)
3. **After cache expires**: Repeat from step 1

**Benefits:**
- ✅ **Reduces API calls** - Save money on external API usage
- ✅ **Faster responses** - Cached responses return instantly
- ✅ **Global edge cache** - Shared across all Cloudflare regions
- ✅ **Respects rate limits** - Don't spam external APIs
- ✅ **Free** - Cloudflare Cache API is included

**Cache headers:**
```
X-Cache: HIT   (from cache)
X-Cache: MISS  (fetched from API)
```

**Disable caching:**
```js
apis: {
  realtime: {
    url: 'https://api.example.com/live',
    cache: 0  // or omit cache property
  }
}
```

---

## 🔐 Security Features

### Rate Limiting

Built-in rate limiting prevents abuse and protects your API quotas:

```js
// Configure in src/index.js
const RATE_LIMIT = {
  maxRequests: 100,      // Maximum requests per window
  windowMs: 60000,       // Time window (1 minute)
  perIP: true,           // Rate limit per IP (recommended)
  perApp: false          // Or rate limit per app
};
```

**Features:**
- ✅ **Per-IP rate limiting** - Each IP gets its own quota
- ✅ **Standard headers** - Returns `X-RateLimit-*` headers
- ✅ **429 responses** - Clear "Too Many Requests" errors
- ✅ **In-memory** - Fast, no external dependencies
- ✅ **Auto-cleanup** - Expired entries removed automatically

**Response headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704126000000
Retry-After: 45  (only on 429 errors)
```

### Origin Validation

Only requests from whitelisted domains are allowed:

```js
myblog: {
  origins: [
    'https://myblog.com',
    'https://www.myblog.com',
    'http://localhost:3000'  // For development
  ]
}
```

Requests from other domains get a 403 Forbidden response.

### Parameter Whitelisting

Only specified parameters are forwarded:

```js
params: ['q', 'lang']  // Other params are ignored
```

Prevents clients from injecting malicious parameters.

### Body Field Filtering

Only allowed fields in POST bodies:

```js
bodyFields: ['event', 'data']  // Other fields stripped
```

Protects against injection attacks.

### Secret Isolation

Each app/API can use different secrets. If one is compromised, others remain safe.

---

## ❓ FAQ

**Q: Is this more secure than .env files?**  
A: **Yes!** With .env, secrets are bundled into JavaScript where users can extract them. With StatEnv, secrets never leave the Worker.

**Q: Does this add latency?**  
A: First request adds ~20-50ms for the proxy hop. But with caching enabled, subsequent requests are served from Cloudflare's edge cache and are actually **faster** than calling the API directly!

**Q: Can users still abuse my APIs?**  
A: You can add rate limiting in the Worker (per origin, per IP, etc.). Much harder to abuse than exposed keys.

**Q: What if my Worker goes down?**  
A: Cloudflare Workers have 99.99%+ uptime. Much more reliable than exposing keys that can be stolen forever.

**Q: How many API calls can I make?**  
A: Cloudflare free tier allows 100,000 requests/day. Plenty for most use cases.

**Q: Can I use this with any API?**  
A: Yes! Just configure the endpoint URL, method, and parameters in the Worker config.

**Q: What about API rate limits?**  
A: The built-in caching dramatically reduces external API calls. If 1000 users request weather data within 5 minutes, the external API is only called once!

**Q: How much does caching save?**  
A: Example: Weather API costs $0.0001 per request. Without caching, 10,000 requests = $1. With 5-minute caching, maybe 100 requests = $0.01. **99% cost reduction!**

---

## 🆘 Troubleshooting

### "Forbidden" error

Check that your domain is in the `origins` array:

```js
origins: ['https://yourdomain.com', 'http://localhost:3000']
```

### "Configuration error"

The Wrangler secret is missing. Set it:

```bash
wrangler secret put APPNAME_SECRETNAME
```

### CORS errors

The Worker handles CORS automatically. Make sure you're making requests from an allowed origin.

### "Unknown API endpoint"

Check that the API name matches your config:

```js
apis: {
  weather: { ... }  // Call with fetch('/myblog/weather?...')
}
```

### "Too Many Requests" (429)

You've hit the rate limit. Check the response headers:

```js
const response = await fetch(url);
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry in ${retryAfter} seconds`);
}
```

To adjust limits, edit `RATE_LIMIT` in `src/index.js`:

```js
const RATE_LIMIT = {
  maxRequests: 200,   // Increase limit
  windowMs: 60000     // Keep 1 minute window
};
```

---

## 🎯 Next Steps

1. ✅ Review `src/index.js` and configure your apps
2. ✅ Set your secrets with `wrangler secret put`
3. ✅ Deploy with `wrangler deploy`
4. ✅ Replace hardcoded API keys with `fetch` calls to your Worker
5. ✅ Test with `examples/example.html`

---

**Keep your secrets secret! 🔐**

Ready to deploy? Run `wrangler deploy`
