# New CLI Features

## Overview

The StatEnv CLI has been enhanced with powerful configuration management features, validation, and deployment controls.

---

## 🎯 New Commands

### 1. `statenv validate`

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

**Features:**
- Validates app names (alphanumeric, hyphens, underscores)
- Validates all origin URLs
- Validates API URLs
- Checks for required fields (url, secret, method)
- Validates secret name format (UPPERCASE_WITH_UNDERSCORES)
- Validates HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Validates params and bodyFields arrays
- Validates cache values (must be positive numbers)

---

### 2. `statenv list-apps`

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

### 3. `statenv remove-app`

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

### 4. `statenv deploy --dry-run`

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
- Validates configuration before deployment
- Shows what would be deployed
- Safe way to check everything before actual deployment
- Catches configuration errors early

**Regular deploy with validation:**
```bash
statenv deploy
```

Now automatically validates configuration first:
```
ℹ Deploying StatEnv Worker

ℹ Validating configuration...
✓ Configuration is valid ✓

ℹ Deploying...
✓ Deployment successful!
```

If validation fails:
```
✗ Configuration has errors. Fix them before deploying:
  ✗ myblog: invalid origin URL: htp://localhost
  ✗ myshop.stripe: url is required

ℹ Run "statenv validate" for details
```

---

## 📦 Configuration File Support

### Config File Locations

StatEnv now supports standalone configuration files:

1. `.statenvrc` (JSON)
2. `statenv.config.json` (JSON)
3. `.statenv.json` (JSON)

**Priority:** Files are checked in the order above. First found file is used.

### Example `.statenvrc`

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
      }
    }
  }
}
```

See `.statenvrc.example` for a complete example.

### Using Config Files

Config files are currently used by the CLI for:
- Future: Template storage
- Future: Default values for `add-app`
- Future: Shared configurations across projects

**Coming soon:**
- Generate config from existing `src/index.js`
- Import config file into `src/index.js`
- Sync config between file and worker

---

## 🔧 Format and Check Scripts

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

---

## 🎨 Prettier Configuration

The project now includes Prettier for consistent code formatting.

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

**`.prettierignore`:**
- `node_modules`
- `dist`
- `.wrangler`
- `coverage`
- `*.log`
- Lock files

---

## 📋 Validation Rules

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

## 🔄 Updated Workflow

### 1. Development
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

### 2. Pre-Deployment
```bash
# Full check
pnpm run check

# Dry run deployment
statenv deploy --dry-run

# Review what will be deployed
```

### 3. Deployment
```bash
# Deploy (now with automatic validation)
statenv deploy

# Monitor
statenv tail
```

### 4. Maintenance
```bash
# List all apps
statenv list-apps

# Remove old app
statenv remove-app

# Validate after changes
statenv validate
```

---

## 🆕 What Changed

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

### New Scripts

| Script | Description |
|--------|-------------|
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check code formatting |
| `pnpm run check` | Full validation (format + config) |

### New Files

| File | Purpose |
|------|---------|
| `.prettierrc` | Prettier configuration |
| `.prettierignore` | Prettier ignore rules |
| `.statenvrc.example` | Example config file |
| `cli/config.js` | Config management utilities |
| `cli/NEW_FEATURES.md` | This documentation |

---

## 🐛 Bug Fixes

All issues from `cli/REVIEW.md` have been addressed:

1. ✅ Fixed readline resource leaks
2. ✅ Improved URL validation
3. ✅ Better error handling with DEBUG mode
4. ✅ Consistent pnpm usage
5. ✅ Fixed JSON indentation in output
6. ✅ Added version command
7. ✅ Better error messages

---

## 🚀 Coming Soon

Features planned for future releases:

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
   ```

4. **Doctor Command**
   ```bash
   statenv doctor    # Check everything
   ```

5. **Interactive Edit**
   ```bash
   statenv edit-app myblog    # Edit existing app
   ```

---

## 📚 See Also

- [CLI README](./README.md) - Full CLI documentation
- [CLI Review](./REVIEW.md) - Detailed review and improvements
- [Main README](../README.md) - Project overview
- [Monitoring Guide](../docs/MONITORING.md) - Monitoring and analytics

---

*Last updated: 2025-10-05*
