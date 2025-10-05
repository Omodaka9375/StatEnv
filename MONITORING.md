# 📊 Monitoring StatEnv

Real-time monitoring with zero overhead using `wrangler tail`.

---

## 🎯 Quick Start

### Start Monitoring

```bash
# Monitor your deployed Worker
wrangler tail

# Monitor with filters
wrangler tail --status error
wrangler tail --status ok
```

---

## 📝 What You'll See

### Successful Requests

```
GET https://statenv.yourname.workers.dev/myblog/weather?q=London
[2025-01-05 03:47:35] Cache MISS for myblog/weather
[2025-01-05 03:47:35] ✓ 200 OK (125ms)

GET https://statenv.yourname.workers.dev/myblog/weather?q=London
[2025-01-05 03:47:40] Cache HIT for myblog/weather
[2025-01-05 03:47:40] ✓ 200 OK (5ms)
```

### Rate Limiting

```
GET https://statenv.yourname.workers.dev/myblog/weather?q=Paris
[2025-01-05 03:48:00] Rate limit exceeded for 192.168.1.100
[2025-01-05 03:48:00] ✗ 429 Too Many Requests
```

### Origin Blocking

```
GET https://statenv.yourname.workers.dev/myblog/weather?q=Tokyo
[2025-01-05 03:48:10] Blocked request from origin: https://evil-site.com
[2025-01-05 03:48:10] ✗ 403 Forbidden
```

### Errors

```
GET https://statenv.yourname.workers.dev/myblog/badapi
[2025-01-05 03:48:20] Worker error: Unknown API endpoint
[2025-01-05 03:48:20] ✗ 404 Not Found
```

---

## 🔍 Filtering Options

### By Status

```bash
# Only show errors
wrangler tail --status error

# Only show successful requests
wrangler tail --status ok

# Only show cancellations
wrangler tail --status canceled
```

### By Request Method

```bash
# Only GET requests
wrangler tail --method GET

# Only POST requests
wrangler tail --method POST
```

### By Sampling

```bash
# Sample 10% of requests (for high traffic)
wrangler tail --sampling-rate 0.1

# Sample 50% of requests
wrangler tail --sampling-rate 0.5
```

### By IP Address

```bash
# Filter by client IP
wrangler tail --ip-address 192.168.1.100
```

### By Search Term

```bash
# Search logs for specific text
wrangler tail --search "Cache HIT"
wrangler tail --search "Rate limit"
wrangler tail --search "myblog"
```

---

## 📊 Common Monitoring Patterns

### Monitor Cache Performance

```bash
wrangler tail --search "Cache"
```

Look for:
- High `Cache HIT` = Good performance ✅
- High `Cache MISS` = Check cache settings ⚠️

### Monitor Rate Limiting

```bash
wrangler tail --search "Rate limit"
```

If you see many rate limit messages:
- Legitimate traffic spike? Increase limits
- Attack? Check the IPs and block at Cloudflare level

### Monitor Specific App

```bash
wrangler tail --search "myblog"
```

See all requests for a specific app.

### Monitor Errors Only

```bash
wrangler tail --status error
```

Quickly spot issues without noise from successful requests.

---

## 🎨 Pretty Output with jq

Parse JSON output for custom views:

```bash
# Pretty print JSON logs
wrangler tail --format json | jq

# Extract just URLs
wrangler tail --format json | jq -r '.event.request.url'

# Extract cache status
wrangler tail --format json | jq -r '.logs[] | select(.message | contains("Cache"))'
```

---

## 🚀 Development Workflow

### Local Development

```bash
# Terminal 1: Run dev server
wrangler dev

# Terminal 2: Monitor logs
wrangler tail --env dev
```

### Before Deployment

```bash
# Monitor production while testing
wrangler tail

# Make test requests from your app
# Watch for errors or unexpected behavior
```

### After Deployment

```bash
# Monitor for the first few minutes
wrangler tail

# Watch for:
# - Configuration errors
# - Missing secrets
# - Unexpected traffic patterns
```

---

## 📈 Performance Monitoring

### Check Response Times

Look for the timing in logs:
```
✓ 200 OK (125ms)  ← First request (API call)
✓ 200 OK (5ms)    ← Cached request (fast!)
```

**Good:**
- Cache hits: <10ms ✅
- Cache misses: <200ms ✅

**Needs attention:**
- Cache hits: >50ms ⚠️
- Cache misses: >500ms ⚠️

### Monitor Cache Hit Ratio

Count cache hits vs misses over 1 minute:

```bash
# In one terminal
wrangler tail --search "Cache"

# Manually count:
# HIT: 85
# MISS: 15
# Hit ratio: 85% ✅
```

**Good cache hit ratio:**
- Weather data: >80% ✅
- Static content: >90% ✅
- Real-time data: >50% ✅

---

## 🛠️ Troubleshooting with Tail

### Issue: "Forbidden" Errors

```bash
wrangler tail --status error --search "Forbidden"
```

**Look for:**
```
Blocked request from origin: https://unexpected-site.com
```

**Fix:** Add origin to `origins` array in config.

### Issue: "Configuration error"

```bash
wrangler tail --search "Configuration"
```

**Look for:**
```
Secret MYBLOG_API_KEY not found
```

**Fix:** Run `wrangler secret put MYBLOG_API_KEY`

### Issue: Slow responses

```bash
wrangler tail
```

**Look for:**
- High response times (>500ms)
- Many cache misses
- External API timeouts

**Fix:**
- Increase cache duration
- Check external API performance
- Add timeout handling

### Issue: Too many requests

```bash
wrangler tail --search "Rate limit"
```

**Look for:**
```
Rate limit exceeded for 192.168.1.100
```

**Fix:**
- Check if IP is legitimate
- Adjust rate limits if needed
- Block abusive IPs at Cloudflare level

---

## 🎯 Pro Tips

### 1. Keep Tail Running in Background

```bash
# Save logs to file
wrangler tail > statenv-logs.txt

# Or append
wrangler tail >> statenv-logs.txt
```

### 2. Filter and Count

```bash
# Count cache hits in last minute
wrangler tail --search "Cache HIT" | wc -l
```

### 3. Monitor Multiple Workers

```bash
# Terminal 1: Production
wrangler tail

# Terminal 2: Staging
wrangler tail --env staging
```

### 4. Alert on Errors

```bash
# Simple error alerting (Unix)
wrangler tail --status error | while read line; do
  echo "ERROR: $line"
  # Send notification (e.g., curl to webhook)
done
```

---

## 📚 Log Messages Reference

### Info Messages
| Message | Meaning |
|---------|---------|
| `Cache HIT for app/api` | Response served from cache |
| `Cache MISS for app/api` | Fetched from external API |

### Warning Messages
| Message | Meaning |
|---------|---------|
| `Rate limit exceeded for {ip}` | IP hit rate limit |
| `Blocked request from origin: {url}` | Origin not whitelisted |

### Error Messages
| Message | Meaning |
|---------|---------|
| `Secret {name} not found` | Missing Worker secret |
| `Unknown app` | App not in config |
| `Unknown API endpoint` | API not configured |
| `Worker error: {msg}` | Internal error |

---

## 🔗 Cloudflare Analytics (Built-in, Free)

Cloudflare provides powerful analytics for your Worker at **zero cost and zero overhead**.

### Access Analytics Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: **Workers & Pages** → **statenv** (your Worker)
3. Click the **Analytics** tab

### What You'll See

#### Overview Tab

**Request Metrics (Last 24h/7d/30d):**
```
┌─────────────────────────────────┐
│ Total Requests      45,230         │
│ Success Rate        99.2%          │
│ Errors              350 (0.8%)     │
│ Avg Response Time   125ms          │
│ 95th Percentile     280ms          │
└─────────────────────────────────┘
```

**Request Timeline:**
- Interactive graph showing requests over time
- Hover to see exact numbers
- Spot traffic spikes or drops

**Status Code Breakdown:**
```
200 OK:          44,500 (98.4%)
429 Rate Limit:     500 (1.1%)
403 Forbidden:      150 (0.3%)
404 Not Found:       50 (0.1%)
500 Server Error:    30 (0.1%)
```

**Geographic Distribution:**
- Map showing requests by country
- Identify where your users are
- Useful for compliance and CDN optimization

#### Performance Tab

**Response Time Distribution:**
```
P50 (Median):  45ms  │██████████████████████████████
P75:           85ms  │█████████████████████████████████████████████
P95:          280ms  │████████████████████████████████████████████████████████████
P99:          520ms  │███████████████████████████████████████████████████████████████████████████
```

**CPU Time:**
- Average CPU usage per request
- Helps identify expensive operations
- Free tier limit: 10ms per request

#### Error Tab

**Error Rate Over Time:**
- Graph showing error trends
- Filter by status code (403, 404, 429, 500)

**Top Errors:**
```
429 Too Many Requests:  500 occurrences
403 Forbidden:          150 occurrences
404 Not Found:           50 occurrences
```

**Error Details:**
- Click any error to see:
  - Timestamp
  - Request URL
  - Client IP (anonymized)
  - User agent
  - Error message

---

## 📊 Interpreting Analytics

### Health Indicators

#### ✅ Healthy Worker
```
Success Rate:        >99%
Avg Response Time:   <200ms
P95 Response Time:   <500ms
Error Rate:          <1%
CPU Time:            <5ms
```

#### ⚠️ Needs Attention
```
Success Rate:        95-99%
Avg Response Time:   200-500ms
P95 Response Time:   500-1000ms
Error Rate:          1-5%
CPU Time:            5-8ms
```

#### ❌ Critical Issues
```
Success Rate:        <95%
Avg Response Time:   >500ms
P95 Response Time:   >1000ms
Error Rate:          >5%
CPU Time:            >8ms
```

### Common Patterns

#### High 429 Errors
**Symptom:**
```
429 Rate Limit: 2,000+ per day
```

**Diagnosis:**
- Rate limits too strict
- Traffic spike from legitimate users
- Potential DDoS attack

**Action:**
1. Check `wrangler tail --search "Rate limit"` for IPs
2. Increase `RATE_LIMIT.maxRequests` if legitimate
3. Block abusive IPs at Cloudflare level

#### High 403 Errors
**Symptom:**
```
403 Forbidden: 500+ per day
```

**Diagnosis:**
- Users accessing from unauthorized domains
- Missing origin in `origins` array
- Incorrect CORS configuration

**Action:**
1. Check `wrangler tail --search "Blocked"` for origins
2. Add legitimate origins to config
3. Deploy updated Worker

#### Slow Response Times
**Symptom:**
```
P95 Response Time: >800ms
```

**Diagnosis:**
- Low cache hit rate
- Slow external API
- Too many cache misses

**Action:**
1. Check `wrangler tail --search "Cache"` for hit ratio
2. Increase cache duration if appropriate
3. Check external API performance
4. Consider caching more aggressively

#### High CPU Time
**Symptom:**
```
Avg CPU Time: >8ms
```

**Diagnosis:**
- Complex request processing
- Large response bodies
- Inefficient code

**Action:**
1. Profile Worker code
2. Optimize loops and string operations
3. Reduce response payload size
4. Consider caching computed results

---

## 📊 Using Analytics API (Advanced)

Query analytics programmatically with GraphQL.

### Setup

1. Get your **Account ID** from Cloudflare Dashboard
2. Create an **API Token** with Analytics permissions:
   - Dashboard → My Profile → API Tokens → Create Token
   - Permissions: `Account.Account Analytics:Read`

### Example Query

```bash
curl -X POST https://api.cloudflare.com/client/v4/graphql \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      viewer {
        accounts(filter: {accountTag: \"YOUR_ACCOUNT_ID\"}) {
          workersInvocationsAdaptive(
            filter: {
              datetime_geq: \"2025-01-04T00:00:00Z\"
              datetime_lt: \"2025-01-05T00:00:00Z\"
              scriptName: \"statenv\"
            }
            limit: 1000
          ) {
            sum {
              requests
              errors
            }
            avg {
              cpuTime
              wallTime
            }
            quantiles {
              wallTimeP50
              wallTimeP95
              wallTimeP99
            }
          }
        }
      }
    }"
  }'
```

### Response

```json
{
  "data": {
    "viewer": {
      "accounts": [
        {
          "workersInvocationsAdaptive": [
            {
              "sum": {
                "requests": 45230,
                "errors": 350
              },
              "avg": {
                "cpuTime": 2.5,
                "wallTime": 125.3
              },
              "quantiles": {
                "wallTimeP50": 45,
                "wallTimeP95": 280,
                "wallTimeP99": 520
              }
            }
          ]
        }
      ]
    }
  }
}
```

### Build Your Own Dashboard

Use the API to create custom dashboards:

```js
// Fetch analytics every 5 minutes
setInterval(async () => {
  const stats = await fetchWorkerStats();
  updateDashboard(stats);
}, 300000);
```

---

## 🎯 Best Practices

### Daily Monitoring Routine

**Morning Check (5 minutes):**
1. Open Cloudflare Analytics Dashboard
2. Check success rate (should be >99%)
3. Review error count (look for spikes)
4. Check response times (P95 <500ms)
5. Review geographic distribution (expected?)

**Weekly Review (15 minutes):**
1. Compare week-over-week request volume
2. Analyze error trends
3. Check cache hit ratio trends
4. Review rate limiting patterns
5. Identify optimization opportunities

**Monthly Analysis (30 minutes):**
1. Download full month data via API
2. Calculate total costs (if any)
3. Review growth trends
4. Plan capacity/scaling needs
5. Update monitoring thresholds

### Set Up Alerts

Cloudflare doesn't have built-in Worker alerts (yet), but you can:

**Option 1: Cloudflare Notifications**
- Dashboard → Notifications
- Set up alerts for:
  - Account-level issues
  - Traffic anomalies
  - Security events

**Option 2: External Monitoring**
- Use a service like UptimeRobot (free)
- Ping your Worker every 5 minutes
- Get alerts if it's down

**Option 3: Custom Monitoring**
- Query Analytics API periodically
- Send alerts if metrics exceed thresholds
- Example: Email if error rate >5%

---

## 🔗 Additional Resources

### Cloudflare Docs
- [Workers Analytics](https://developers.cloudflare.com/workers/observability/analytics/)
- [GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)

### External Monitoring (Optional)

**Free Options:**
- **UptimeRobot**: Uptime monitoring
- **Better Stack**: Error tracking (free tier)
- **Sentry**: Error tracking (free tier)

**Paid Options:**
- **Datadog**: Full observability ($15/month)
- **New Relic**: APM monitoring ($25/month)
- **Honeycomb**: Distributed tracing ($20/month)

### Logpush (Advanced)

Send Worker logs to external services:

1. **Setup:**
   - Dashboard → Analytics → Logs → Logpush
   - Choose destination (S3, R2, HTTP endpoint)
   - Configure fields and filters

2. **Free Tier:**
   - Up to 1M log lines per day
   - After that: $0.05 per million lines

3. **Use Cases:**
   - Long-term log retention
   - Custom analytics
   - Compliance/audit trails
   - Machine learning on logs

---

## 🎯 Summary

### 🛠️ Development & Debugging

**Real-time logs (`wrangler tail`):**
```bash
# Watch everything
wrangler tail

# Focus on specific areas
wrangler tail --status error        # Errors only
wrangler tail --search "Cache"      # Cache performance
wrangler tail --search "Rate limit" # Rate limiting
```

**Best for:**
- Local development
- Real-time debugging
- Immediate feedback
- Zero overhead

### 📊 Production Monitoring

**Cloudflare Analytics Dashboard:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages → statenv → Analytics
3. Review metrics daily

**Best for:**
- Historical data
- Trends analysis
- Performance metrics
- Error tracking
- Geographic insights

### 🤖 Automated Monitoring

**GraphQL Analytics API:**
- Query metrics programmatically
- Build custom dashboards
- Set up automated alerts
- Integrate with existing tools

**Best for:**
- Custom monitoring solutions
- Alerting systems
- Compliance reporting
- Data analysis

---

### 🎯 Quick Reference

| Need | Tool | Command/Link |
|------|------|-------------|
| Real-time logs | wrangler tail | `wrangler tail` |
| Error monitoring | wrangler tail | `wrangler tail --status error` |
| Cache performance | wrangler tail | `wrangler tail --search Cache` |
| Historical data | Cloudflare Dashboard | [dash.cloudflare.com](https://dash.cloudflare.com) |
| Custom metrics | GraphQL API | See Analytics API section |
| Uptime monitoring | UptimeRobot | [uptimerobot.com](https://uptimerobot.com) |

---

**Zero overhead. Comprehensive. Production-ready! 🚀**
