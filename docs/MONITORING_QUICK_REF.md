# 📊 StatEnv Monitoring - Quick Reference

## 🚀 Commands

```bash
# Real-time monitoring
pnpm run tail                    # All requests
pnpm run tail:errors             # Errors only
pnpm run tail:cache              # Cache performance
pnpm run tail:ratelimit          # Rate limiting

# Advanced filtering
wrangler tail --status error     # Error requests
wrangler tail --status ok        # Successful requests
wrangler tail --method POST      # POST requests only
wrangler tail --search "myblog"  # Specific app
wrangler tail --sampling-rate 0.1 # 10% sampling
```

## 📈 Cloudflare Dashboard

**Access:**
1. [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages → statenv → Analytics

**Tabs:**
- **Overview**: Requests, success rate, response times
- **Performance**: P50/P95/P99 latency, CPU time
- **Errors**: Error trends, top errors

## 🎯 Health Check

### ✅ Healthy
- Success Rate: >99%
- P95 Response: <500ms
- Error Rate: <1%
- CPU Time: <5ms

### ⚠️ Warning
- Success Rate: 95-99%
- P95 Response: 500-1000ms
- Error Rate: 1-5%
- CPU Time: 5-8ms

### ❌ Critical
- Success Rate: <95%
- P95 Response: >1000ms
- Error Rate: >5%
- CPU Time: >8ms

## 🔍 Common Issues

### High 429 Errors
```bash
wrangler tail --search "Rate limit"
```
**Fix:** Increase rate limits or block abusive IPs

### High 403 Errors
```bash
wrangler tail --search "Blocked"
```
**Fix:** Add missing origins to config

### Slow Responses
```bash
wrangler tail --search "Cache"
```
**Fix:** Increase cache duration, check external API

### Missing Secrets
```bash
wrangler tail --search "Configuration"
```
**Fix:** Run `wrangler secret put APPNAME_VARNAME`

## 📊 Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | >99% | 95-99% | <95% |
| Avg Response | <200ms | 200-500ms | >500ms |
| P95 Response | <500ms | 500-1000ms | >1000ms |
| Cache Hit Rate | >80% | 60-80% | <60% |
| Error Rate | <1% | 1-5% | >5% |

## 🛠️ Troubleshooting

```bash
# Find source of errors
wrangler tail --status error --format json | jq '.event.request.url'

# Count cache hit ratio
wrangler tail --search "Cache HIT" | measure
wrangler tail --search "Cache MISS" | measure

# Monitor specific IP
wrangler tail | findstr "192.168.1.100"

# Save logs for analysis
wrangler tail > logs.txt
```

## 🔗 Resources

- Full Guide: [MONITORING.md](MONITORING.md)
- Main README: [../README.md](../README.md)
- Cloudflare Docs: [developers.cloudflare.com/workers/observability](https://developers.cloudflare.com/workers/observability/)
- GraphQL API: [developers.cloudflare.com/analytics/graphql-api](https://developers.cloudflare.com/analytics/graphql-api/)
