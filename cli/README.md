# StatEnv CLI

Interactive command-line tool for managing StatEnv deployments with powerful configuration management, validation, and deployment controls.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [Core Commands](#core-commands)
  - [Configuration Management](#configuration-management)
  - [Deployment](#deployment)
  - [Secrets Management](#secrets-management)
  - [Monitoring](#monitoring)
- [Configuration Files](#configuration-files)
- [Validation Rules](#validation-rules)
- [Scripts](#scripts)
- [Workflows](#workflows)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

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

## Quick Start

```bash
# Install dependencies
pnpm install

# Link CLI globally
npm link

# Add an app
statenv add-app

# Validate configuration
statenv validate

# Preview deployment
statenv deploy --dry-run

# Deploy
statenv deploy
```

---

## Commands

### Core Commands

#### `statenv init`

Shows instructions for initializing a new StatEnv project.

```bash
statenv init
```

**What it does:**
- Displays setup instructions for StatEnv
- Guides you through cloning the repository
- Shows how to install dependencies
- Provides next steps for configuration

**Output:**
```
ℹ StatEnv Initialization

ℹ To initialize StatEnv:
  1. Clone the repository:
     git clone https://github.com/yourusername/statenv.git

  2. Install dependencies:
     cd statenv && pnpm install

  3. Configure your apps in src/index.js

  4. Deploy:
     pnpm run deploy
```

**Note:** This is currently a guidance command. A future version will scaffold the project automatically.

#### `statenv version`

Show CLI version.

```bash
statenv version
# or
statenv --version
# or
statenv -v
```

**Output:**
```
statenv v1.0.0
```

---

### Configuration Management

#### `statenv add-app`

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

#### `statenv validate`

Validates your configuration in `src/index.js` for errors and warnings.

```bash
statenv validate
```

**Output:**
```
ℹ Validating configuration...

✓ Configuration is valid! ✓

  Apps: 2
  APIs: 4
```

**With errors:**
```
✗ Configuration has errors

Errors:
  ✗ myblog: invalid origin URL: htp://localhost:3000
  ✗ myblog.weather: invalid URL: not-a-url
  ✗ myshop.stripe: secret is required

Warnings:
  ⚠ myblog.analytics: method not specified, defaults to GET
```

**Validates:**
- App names (alphanumeric, hyphens, underscores)
- Origin URLs (valid URLs starting with http/https)
- API URLs (valid URLs)
- Required fields (url, secret, method)
- Secret name format (UPPERCASE_WITH_UNDERSCORES)
- HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Params arrays (for GET requests)
- Body fields arrays (for POST/PUT/PATCH)
- Cache values (positive numbers)

---

#### `statenv list-apps`

Lists all configured apps with their APIs and origins.

```bash
statenv list-apps
```

**Output:**
```
ℹ Listing apps...

✓ Found 2 app(s):

  myblog
    APIs: 2
    Origins: 2
      - weather
      - analytics

  myshop
    APIs: 2
    Origins: 2
      - stripe
      - inventory
```

**Use cases:**
- Quick overview of your configuration
- See which apps are configured
- Count APIs and origins per app
- List all API names

---

#### `statenv remove-app`

Interactive command to remove an app from your configuration.

```bash
statenv remove-app
```

**Workflow:**
```
⚠ Remove App

ℹ Available apps:
  - myblog
  - myshop

App name to remove: myblog
Are you sure you want to remove "myblog"? (y/N): y

⚠ This command shows what to remove. You need to manually edit src/index.js

ℹ Remove this section from src/index.js:

  myblog: {
    // ... entire app configuration
  },

ℹ Also remove associated secrets:
  wrangler secret delete MYBLOG_WEATHER_KEY
  wrangler secret delete MYBLOG_ANALYTICS_KEY
```

**Note:** This command provides guidance but doesn't automatically edit files. You need to manually:
1. Remove the app section from `src/index.js`
2. Delete the associated secrets using the provided commands

---

### Deployment

#### `statenv deploy`

Deploy the Worker to Cloudflare with automatic validation.

```bash
statenv deploy
```

**Automatically:**
1. Validates configuration
2. Checks for errors
3. Prevents deployment if validation fails
4. Deploys only if everything is valid

**Output:**
```
ℹ Deploying StatEnv Worker

ℹ Validating configuration...
✓ Configuration is valid ✓

ℹ Deploying...
✓ Deployment successful!
```

**If validation fails:**
```
✗ Configuration has errors. Fix them before deploying:
  ✗ myblog: invalid origin URL: htp://localhost
  ✗ myshop.stripe: url is required

ℹ Run "statenv validate" for details
```

---

#### `statenv deploy --dry-run`

Preview deployment without actually deploying.

```bash
statenv deploy --dry-run
```

**Output:**
```
ℹ Dry Run: Deploy StatEnv Worker

ℹ Validating configuration...
✓ Configuration is valid ✓

ℹ Dry run mode - deployment skipped

ℹ What would be deployed:
  Worker: src/index.js
  Config: wrangler.toml

ℹ Run "statenv deploy" without --dry-run to actually deploy
```

**Features:**
- Validates configuration before showing dry-run
- Shows what would be deployed
- Safe way to check everything before actual deployment
- Catches configuration errors early

---

### Secrets Management

#### `statenv secrets list`

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

#### `statenv secrets add`

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

### Monitoring

#### `statenv tail`

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

#### `statenv test`

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

#### `statenv help`

Show help message with all commands.

```bash
statenv help
# or
statenv --help
# or
statenv -h
```

---

## Configuration Files

### Supported Formats

StatEnv supports standalone configuration files:

1. `.statenvrc` (JSON)
2. `statenv.config.json` (JSON)
3. `.statenv.json` (JSON)

**Priority:** Files are checked in the order above. First found file is used.

### Example Configuration

```json
{
  "myblog": {
    "origins": [
      "https://myblog.com",
      "http://localhost:3000"
    ],
    "apis": {
      "weather": {
        "url": "https://api.weatherapi.com/v1/current.json",
        "secret": "MYBLOG_WEATHER_KEY",
        "method": "GET",
        "params": ["q", "lang"],
        "cache": 600
      },
      "analytics": {
        "url": "https://api.example.com/track",
        "secret": "MYBLOG_ANALYTICS_KEY",
        "method": "POST",
        "bodyFields": ["event", "data", "timestamp"]
      }
    }
  }
}
```

See `statenv.config.json` for a complete example with multiple apps.

### Future Features

**Coming soon:**
- Generate config from existing `src/index.js`
- Import config file into `src/index.js`
- Sync config between file and worker
- Template storage and reuse

---

## Validation Rules

### App Names
- Must start with a letter
- Can contain: letters, numbers, hyphens, underscores
- Examples: `myblog`, `my-shop`, `app_123`

### Origin URLs
- Must be valid URLs
- Must start with `http://` or `https://`
- Examples: `https://myblog.com`, `http://localhost:3000`

### API Names
- Must start with a letter
- Can contain: letters, numbers, underscores
- Examples: `weather`, `stripe_v1`, `analytics2`

### API URLs
- Must be valid URLs
- Must start with `http://` or `https://`

### Secret Names
- Should be UPPERCASE_WITH_UNDERSCORES
- Examples: `MYBLOG_WEATHER_KEY`, `APP_API_SECRET`

### HTTP Methods
- Supported: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Case-insensitive

### Params (for GET requests)
- Must be an array of strings
- Example: `["q", "lang", "limit"]`

### Body Fields (for POST/PUT/PATCH)
- Must be an array of strings
- Example: `["event", "data", "timestamp"]`

### Cache Duration
- Must be a positive number (seconds)
- 0 = no cache
- Example: `300` (5 minutes), `600` (10 minutes)

---

## Scripts

### Format Code

Format all JavaScript, JSON, and Markdown files:

```bash
pnpm run format
```

### Check Formatting

Check if files are properly formatted:

```bash
pnpm run format:check
```

### Full Check

Run formatting check + config validation:

```bash
pnpm run check
```

Equivalent to:
```bash
pnpm run format:check && statenv validate
```

**Use in CI/CD:**
```yaml
- name: Check code quality
  run: pnpm run check
```

### Prettier Configuration

The project includes Prettier for consistent code formatting:

**`.prettierrc`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "auto"
}
```

---

## Workflows

### Typical Workflow

#### 1. Setup New Project

```bash
# Clone the repo
git clone https://github.com/yourusername/statenv.git
cd statenv

# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login
```

#### 2. Add Your First App

```bash
# Interactive wizard
statenv add-app
```

Follow the prompts to configure:
- App name: `myblog`
- Origins: `https://myblog.com`
- API: `weather` → `https://api.weatherapi.com/...`

Copy the generated config to `src/index.js`.

#### 3. Set Secrets

```bash
statenv secrets add
# or directly:
wrangler secret put MYBLOG_WEATHER_KEY
```

#### 4. Test Locally

```bash
# Run tests
statenv test

# Start dev server
pnpm run dev

# In another terminal, watch logs
statenv tail
```

#### 5. Deploy

```bash
statenv deploy
```

#### 6. Monitor

```bash
# Watch real-time logs
statenv tail

# Or use Cloudflare Analytics
# Dashboard → Workers & Pages → statenv → Analytics
```

### Enhanced Workflow (Recommended)

#### Development
```bash
# Add new app
statenv add-app

# Validate configuration
statenv validate

# Format code
pnpm run format

# Test locally
pnpm run dev
```

#### Pre-Deployment
```bash
# Full check
pnpm run check

# Dry run deployment
statenv deploy --dry-run

# Review what will be deployed
```

#### Deployment
```bash
# Deploy (now with automatic validation)
statenv deploy

# Monitor
statenv tail
```

#### Maintenance
```bash
# List all apps
statenv list-apps

# Remove old app
statenv remove-app

# Validate after changes
statenv validate
```

---

## Tips & Best Practices

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

## Recent Improvements

### Enhanced Commands

| Command | Before | After |
|---------|--------|-------|
| `add-app` | Basic validation | URL validation, better error messages |
| `deploy` | Direct deploy | Pre-deployment validation, dry-run mode |
| `secrets add` | Basic | Secret name format validation |
| `test` | Fixed npm | Auto-detects pnpm/npm |

### New Commands

| Command | Description |
|---------|-------------|
| `validate` | Validate configuration |
| `list-apps` | List all configured apps |
| `remove-app` | Remove app (with guidance) |
| `deploy --dry-run` | Preview deployment |
| `version` | Show CLI version |

### New Scripts

| Script | Description |
|--------|-------------|
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check code formatting |
| `pnpm run check` | Full validation (format + config) |

### Bug Fixes

1. ✅ Fixed readline resource leaks
2. ✅ Improved URL validation
3. ✅ Better error handling with DEBUG mode
4. ✅ Consistent pnpm usage
5. ✅ Fixed JSON indentation in output
6. ✅ Added version command
7. ✅ Better error messages

---

## Future Features

Planned for upcoming releases:

1. **Config Generation**
   ```bash
   statenv export-config    # src/index.js → .statenvrc
   statenv import-config    # .statenvrc → src/index.js
   ```

2. **Template System**
   ```bash
   statenv add-api --template stripe
   statenv add-api --template openai
   ```

3. **Environment Management**
   ```bash
   statenv use staging
   statenv use production
   statenv env list
   ```

4. **Doctor Command**
   ```bash
   statenv doctor    # Check configuration, secrets, deployment
   ```

5. **Interactive Edit**
   ```bash
   statenv edit-app myblog    # Edit existing app
   ```

---

## See Also

- [Main README](../README.md) - Project overview
- [Monitoring Guide](../docs/MONITORING.md) - Monitoring and analytics
- [Test Documentation](../tests/README.md) - Test suite information

---

*Last updated: 2025-10-05*
