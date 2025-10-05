# StatEnv CLI

Interactive command-line tool for managing StatEnv deployments.

## Installation

### Global Installation (Recommended)

```bash
npm install -g statenv
```

### Local Installation

```bash
# In your project
npm install statenv --save-dev

# Use with npx
npx statenv <command>
```

### From Source

```bash
# Clone the repo
git clone https://github.com/yourusername/statenv.git
cd statenv

# Install dependencies
pnpm install

# Link globally
npm link

# Now you can use `statenv` anywhere
statenv help
```

---

## Commands

### `statenv init`

Initialize a new StatEnv project (coming soon - for now, clone the repo).

```bash
statenv init
```

---

### `statenv add-app`

**Interactively add a new app configuration.**

This wizard will guide you through:
1. App name
2. Allowed origins
3. API endpoints (URL, method, params)
4. Cache settings
5. Secret names

```bash
statenv add-app
```

**Example session:**
```
ℹ Add New App

App name (e.g., myblog): myblog
Allowed origins (comma-separated): https://myblog.com,http://localhost:3000

ℹ Now add APIs for this app

API name (e.g., weather): weather
API URL: https://api.weatherapi.com/v1/current.json
HTTP Method (GET/POST) [GET]: GET
Allowed query params (e.g., q,lang) [q]: q,lang
Cache duration in seconds [300]: 600

✓ API "weather" configured with secret: MYBLOG_WEATHER_KEY

Add another API? (y/N): n

✓ Generated configuration:

{
  "myblog": {
    "origins": ["https://myblog.com", "http://localhost:3000"],
    "apis": {
      "weather": {
        "url": "https://api.weatherapi.com/v1/current.json",
        "secret": "MYBLOG_WEATHER_KEY",
        "method": "GET",
        "params": ["q", "lang"],
        "cache": 600
      }
    }
  }
}

ℹ Add this to your src/index.js APP_CONFIG

ℹ Required secrets:
  wrangler secret put MYBLOG_WEATHER_KEY
```

---

### `statenv deploy`

Deploy the Worker to Cloudflare.

```bash
statenv deploy
```

**Checks:**
- ✓ Wrangler installed
- ✓ Logged in to Cloudflare
- ✓ Deploys Worker

---

### `statenv secrets list`

List all configured secrets.

```bash
statenv secrets list
```

**Output:**
```
ℹ Listing secrets...

SECRET_NAME_1
SECRET_NAME_2
MYBLOG_WEATHER_KEY
MYSHOP_STRIPE_KEY
```

---

### `statenv secrets add`

Add a new secret interactively.

```bash
statenv secrets add
```

**Example:**
```
Secret name (e.g., MYBLOG_WEATHER_KEY): MYBLOG_WEATHER_KEY
? Enter a secret value: ********
✓ Secret set successfully
```

---

### `statenv tail`

Watch real-time logs from your deployed Worker.

```bash
statenv tail
```

**Output:**
```
ℹ Starting real-time log tail...
Press Ctrl+C to stop

GET https://statenv.yourname.workers.dev/myblog/weather?q=London
[2025-01-05 04:10:00] Cache MISS for myblog/weather
[2025-01-05 04:10:00] ✓ 200 OK (125ms)
```

**Equivalent to:**
```bash
wrangler tail
```

---

### `statenv test`

Run the test suite.

```bash
statenv test
```

**Output:**
```
ℹ Running tests...

✓ tests/worker.test.js (17)
  ✓ Origin Validation (2)
  ✓ Rate Limiting (3)
  ✓ CORS (2)
  ...

Test Files  1 passed (1)
     Tests  17 passed (17)

✓ All tests passed!
```

---

### `statenv help`

Show help message with all commands.

```bash
statenv help
# or
statenv --help
# or
statenv -h
```

---

## Typical Workflow

### 1. Setup New Project

```bash
# Clone the repo
git clone https://github.com/yourusername/statenv.git
cd statenv

# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login
```

### 2. Add Your First App

```bash
# Interactive wizard
statenv add-app
```

Follow the prompts to configure:
- App name: `myblog`
- Origins: `https://myblog.com`
- API: `weather` → `https://api.weatherapi.com/...`

Copy the generated config to `src/index.js`.

### 3. Set Secrets

```bash
statenv secrets add
# or directly:
wrangler secret put MYBLOG_WEATHER_KEY
```

### 4. Test Locally

```bash
# Run tests
statenv test

# Start dev server
pnpm run dev

# In another terminal, watch logs
statenv tail
```

### 5. Deploy

```bash
statenv deploy
```

### 6. Monitor

```bash
# Watch real-time logs
statenv tail

# Or use Cloudflare Analytics
# Dashboard → Workers & Pages → statenv → Analytics
```

---

## Tips

### Quick Secret Setup

After `add-app` generates your config, it lists all required secrets:

```bash
wrangler secret put MYBLOG_WEATHER_KEY
wrangler secret put MYBLOG_ANALYTICS_KEY
```

Copy-paste these commands to quickly set all secrets.

### Multiple Environments

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### Batch Operations

```bash
# List all secrets and save to file
statenv secrets list > secrets.txt

# Run tests before deploy
statenv test && statenv deploy
```

---

## Troubleshooting

### "Wrangler not found"

Install Wrangler globally:
```bash
npm install -g wrangler
```

### "Not logged in to Cloudflare"

Login first:
```bash
wrangler login
```

### "Command failed"

Enable verbose output:
```bash
# Use wrangler directly for more details
wrangler deploy --verbose
```

### CLI not working after install

Make sure npm global bin is in PATH:
```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (example for Unix)
export PATH="$(npm config get prefix)/bin:$PATH"
```

---

## Development

### Running CLI from Source

```bash
# In StatEnv directory
node cli/statenv.js <command>

# Or link it globally
npm link
statenv <command>
```

### Adding New Commands

Edit `cli/statenv.js`:

```js
async function myNewCommand() {
  log('My new command', 'info');
  // Your command logic
  rl.close();
}

// Add to main() switch
case 'mynew':
  await myNewCommand();
  break;
```

---

## See Also

- [Main README](../README.md)
- [Monitoring Guide](../docs/MONITORING.md)
- [Test Documentation](../tests/README.md)
