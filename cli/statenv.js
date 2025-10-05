#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import {
  readConfig,
  writeConfig,
  readWorkerConfig,
  validateConfig,
  listApps,
  getApp,
  removeApp as removeAppFromConfig,
} from './config.js';

let rl;

function createReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return rl;
}

function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

// Ensure readline is always closed on exit
process.on('exit', closeReadline);
process.on('SIGINT', () => {
  closeReadline();
  process.exit(130);
});
process.on('SIGTERM', () => {
  closeReadline();
  process.exit(143);
});

function question(prompt) {
  return new Promise((resolve) => {
    createReadline().question(prompt, resolve);
  });
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  
  const symbols = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠'
  };
  
  console.log(`${colors[type]}${symbols[type]} ${message}${colors.reset}`);
}

function run(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    if (!silent && output) console.log(output);
    return output;
  } catch (error) {
    if (!silent) {
      log(`Command failed: ${command}`, 'error');
      if (error.stderr) console.error(error.stderr);
    }
    throw error;
  }
}

// Commands

async function initCommand() {
  try {
    log('StatEnv Initialization', 'info');
    console.log('');
    
    // Check if already initialized
    if (existsSync('src/index.js')) {
      const overwrite = await question('StatEnv already initialized. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        log('Initialization cancelled', 'warning');
        return;
      }
    }
    
    log('Creating project structure...', 'info');
    
    // Copy template files
    // For now, guide user to clone the repo
    console.log('');
    log('To initialize StatEnv:', 'info');
    console.log('  1. Clone the repository:');
    console.log('     git clone https://github.com/yourusername/statenv.git');
    console.log('');
    console.log('  2. Install dependencies:');
    console.log('     cd statenv && pnpm install');
    console.log('');
    console.log('  3. Configure your apps in src/index.js');
    console.log('');
    console.log('  4. Deploy:');
    console.log('     pnpm run deploy');
    console.log('');
  } finally {
    closeReadline();
  }
}

async function addAppCommand() {
  try {
    log('Add New App', 'info');
    console.log('');
    
    // Get app details
    const appName = await question('App name (e.g., myblog): ');
    if (!appName || !/^[a-z][a-z0-9_-]*$/i.test(appName)) {
      log('Invalid app name. Use lowercase letters, numbers, hyphens, underscores.', 'error');
      return;
    }
  
    const origins = await question('Allowed origins (comma-separated, e.g., https://myblog.com,http://localhost:3000): ');
    const originsList = origins.split(',').map(o => o.trim()).filter(Boolean);
    
    if (originsList.length === 0) {
      log('At least one origin is required', 'error');
      return;
    }
    
    // Validate origins are proper URLs
    for (const origin of originsList) {
      try {
        new URL(origin);
      } catch {
        log(`Invalid origin URL: ${origin}`, 'error');
        return;
      }
    }
  
    console.log('');
    log('Now add APIs for this app. You can add multiple.', 'info');
    console.log('');
    
    const apis = {};
    let addMore = true;
    
    while (addMore) {
      const apiName = await question('API name (e.g., weather): ');
      if (!apiName || !/^[a-z][a-z0-9_]*$/i.test(apiName)) {
        log('Invalid API name', 'error');
        continue;
      }
      
      const apiUrl = await question('API URL (e.g., https://api.weatherapi.com/v1/current.json): ');
      try {
        new URL(apiUrl);
        if (!apiUrl.startsWith('http')) {
          throw new Error('URL must start with http:// or https://');
        }
      } catch (e) {
        log(`Invalid URL: ${e.message}`, 'error');
        continue;
      }
    
      const method = await question('HTTP Method (GET/POST) [GET]: ');
      const httpMethod = (method.trim().toUpperCase() || 'GET');
      
      if (!['GET', 'POST'].includes(httpMethod)) {
        log('Invalid method. Use GET or POST.', 'error');
        continue;
      }
    
      const secretName = `${appName.toUpperCase()}_${apiName.toUpperCase()}_KEY`;
      
      let params = [];
      let bodyFields = [];
      
      if (httpMethod === 'GET') {
        const paramsInput = await question('Allowed query params (comma-separated, e.g., q,lang) [q]: ');
        params = (paramsInput || 'q').split(',').map(p => p.trim()).filter(Boolean);
      } else {
        const fieldsInput = await question('Allowed body fields (comma-separated, e.g., event,data): ');
        bodyFields = fieldsInput.split(',').map(f => f.trim()).filter(Boolean);
      }
      
      const cache = await question('Cache duration in seconds (0 for no cache) [300]: ');
      const cacheDuration = parseInt(cache) || 300;
      
      // Build API config
      apis[apiName] = {
        url: apiUrl,
        secret: secretName,
        method: httpMethod
      };
      
      if (httpMethod === 'GET' && params.length > 0) {
        apis[apiName].params = params;
      }
      
      if (httpMethod === 'POST' && bodyFields.length > 0) {
        apis[apiName].bodyFields = bodyFields;
      }
      
      if (cacheDuration > 0) {
        apis[apiName].cache = cacheDuration;
      }
      
      log(`API "${apiName}" configured with secret: ${secretName}`, 'success');
      
      const more = await question('Add another API? (y/N): ');
      addMore = more.toLowerCase() === 'y';
      console.log('');
    }
  
    // Generate config
    const appConfig = {
      [appName]: {
        origins: originsList,
        apis: apis
      }
    };
    
    console.log('');
    log('Generated configuration:', 'success');
    console.log('');
    console.log(JSON.stringify(appConfig, null, 2));
    console.log('');
    
    log('Add this to your src/index.js APP_CONFIG:', 'info');
    console.log('');
    console.log(`  ${appName}: {`);
    console.log(`    origins: ${JSON.stringify(originsList)},`);
    console.log(`    apis: ${JSON.stringify(apis, null, 4).replace(/\n/g, '\n    ')}`);
    console.log(`  }`);
    console.log('');
    
    // List required secrets
    log('Required secrets (set with wrangler secret put):', 'info');
    Object.values(apis).forEach(api => {
      console.log(`  wrangler secret put ${api.secret}`);
    });
    console.log('');
  } finally {
    closeReadline();
  }
}

async function deployCommand(dryRun = false) {
  try {
    log(dryRun ? 'Dry Run: Deploy StatEnv Worker' : 'Deploying StatEnv Worker', 'info');
    console.log('');
    
    // Validate configuration first
    log('Validating configuration...', 'info');
    const config = readWorkerConfig();
    
    if (!config) {
      log('No configuration found in src/index.js', 'error');
      return;
    }
    
    if (config.parsed !== false) {
      const result = validateConfig(config);
      if (!result.valid) {
        log('Configuration has errors. Fix them before deploying:', 'error');
        result.errors.forEach(err => console.log(`  ✗ ${err}`));
        console.log('');
        log('Run "statenv validate" for details', 'info');
        return;
      }
      log('Configuration is valid ✓', 'success');
    }
    console.log('');
    
    // Check if wrangler is installed
    try {
      run('wrangler --version', true);
    } catch {
      log('Wrangler not found. Install with: pnpm add -g wrangler', 'error');
      return;
    }
    
    // Check if logged in
    try {
      run('wrangler whoami', true);
    } catch {
      log('Not logged in to Cloudflare. Run: wrangler login', 'error');
      return;
    }
    
    if (dryRun) {
      log('Dry run mode - deployment skipped', 'info');
      console.log('');
      log('What would be deployed:', 'info');
      console.log('  Worker: src/index.js');
      console.log('  Config: wrangler.toml');
      console.log('');
      log('Run "statenv deploy" without --dry-run to actually deploy', 'info');
      return;
    }
    
    // Deploy
    try {
      log('Deploying...', 'info');
      run('wrangler deploy');
      log('Deployment successful!', 'success');
    } catch (error) {
      log('Deployment failed', 'error');
      throw error;
    }
  } finally {
    closeReadline();
  }
}

async function secretsCommand(action) {
  try {
    if (action === 'list') {
      log('Listing secrets...', 'info');
      try {
        run('wrangler secret list');
      } catch {
        log('Failed to list secrets', 'error');
      }
    } else if (action === 'add') {
      const secretName = await question('Secret name (e.g., MYBLOG_WEATHER_KEY): ');
      if (!secretName) {
        log('Secret name required', 'error');
        return;
      }
      
      // Validate secret name format
      if (!/^[A-Z][A-Z0-9_]*$/.test(secretName)) {
        log('Invalid secret name. Use UPPERCASE_WITH_UNDERSCORES format.', 'error');
        return;
      }
      
      log(`Setting secret: ${secretName}`, 'info');
      try {
        run(`wrangler secret put ${secretName}`);
        log('Secret set successfully', 'success');
      } catch {
        log('Failed to set secret', 'error');
      }
    } else {
      log('Unknown secrets command. Use: list or add', 'error');
    }
  } finally {
    closeReadline();
  }
}

function helpCommand() {
  console.log(`
StatEnv CLI - Secure API Proxy for Static Apps

Usage: statenv <command> [options]

Commands:
  init              Initialize a new StatEnv project
  add-app           Add a new app configuration interactively
  list-apps         List all configured apps
  remove-app        Remove an app from configuration
  deploy            Deploy Worker to Cloudflare
  deploy --dry-run  Preview deployment without actually deploying
  validate          Validate configuration in src/index.js
  secrets list      List all secrets
  secrets add       Add a new secret
  test              Run tests
  tail              Watch real-time logs
  version           Show version
  help              Show this help message

Examples:
  statenv init                  # Initialize new project
  statenv add-app               # Add app interactively
  statenv list-apps             # List all apps
  statenv validate              # Validate configuration
  statenv deploy --dry-run      # Preview deployment
  statenv deploy                # Deploy to Cloudflare
  statenv remove-app            # Remove an app
  statenv secrets list          # List all secrets
  statenv secrets add           # Add a new secret
  statenv tail                  # Watch logs
  statenv test                  # Run tests

Documentation:
  https://github.com/yourusername/statenv
  `);
  
  closeReadline();
}

async function tailCommand() {
  try {
    log('Starting real-time log tail...', 'info');
    console.log('Press Ctrl+C to stop');
    console.log('');
    
    try {
      run('wrangler tail');
    } catch {
      log('Failed to tail logs', 'error');
    }
  } finally {
    closeReadline();
  }
}

async function testCommand() {
  try {
    log('Running tests...', 'info');
    console.log('');
    
    // Check which package manager to use
    let testCmd = 'pnpm test';
    if (!existsSync('pnpm-lock.yaml')) {
      testCmd = existsSync('package-lock.json') ? 'npm test' : 'npm test';
    }
    
    try {
      run(testCmd);
      log('All tests passed!', 'success');
    } catch {
      log('Tests failed', 'error');
    }
  } finally {
    closeReadline();
  }
}

function versionCommand() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
    console.log(`statenv v${pkg.version}`);
  } catch {
    console.log('statenv v1.0.0');
  }
  closeReadline();
}

async function validateCommand() {
  try {
    log('Validating configuration...', 'info');
    console.log('');
    
    // Try to read worker config
    const config = readWorkerConfig();
    
    if (!config) {
      log('No configuration found in src/index.js', 'error');
      log('Make sure APP_CONFIG is defined in your worker file', 'info');
      return;
    }
    
    if (config.parsed === false) {
      log('Configuration found but could not be parsed automatically', 'warning');
      log('Manual validation recommended', 'info');
      return;
    }
    
    // Validate the config
    const result = validateConfig(config);
    
    if (result.valid) {
      log('Configuration is valid! ✓', 'success');
      
      const appCount = Object.keys(config).length;
      const apiCount = Object.values(config).reduce((sum, app) => {
        return sum + Object.keys(app.apis || {}).length;
      }, 0);
      
      console.log('');
      console.log(`  Apps: ${appCount}`);
      console.log(`  APIs: ${apiCount}`);
    } else {
      log('Configuration has errors', 'error');
    }
    
    // Display errors
    if (result.errors.length > 0) {
      console.log('');
      log('Errors:', 'error');
      result.errors.forEach(err => {
        console.log(`  ✗ ${err}`);
      });
    }
    
    // Display warnings
    if (result.warnings.length > 0) {
      console.log('');
      log('Warnings:', 'warning');
      result.warnings.forEach(warn => {
        console.log(`  ⚠ ${warn}`);
      });
    }
    
    console.log('');
  } finally {
    closeReadline();
  }
}

async function listAppsCommand() {
  try {
    log('Listing apps...', 'info');
    console.log('');
    
    const config = readWorkerConfig();
    
    if (!config || config.parsed === false) {
      log('Could not read configuration from src/index.js', 'error');
      return;
    }
    
    const apps = listApps(config);
    
    if (apps.length === 0) {
      log('No apps configured', 'warning');
      return;
    }
    
    log(`Found ${apps.length} app(s):`, 'success');
    console.log('');
    
    for (const appName of apps) {
      const appConfig = config[appName];
      const apiCount = Object.keys(appConfig.apis || {}).length;
      const originCount = (appConfig.origins || []).length;
      
      console.log(`  ${appName}`);
      console.log(`    APIs: ${apiCount}`);
      console.log(`    Origins: ${originCount}`);
      
      // List APIs
      if (apiCount > 0) {
        Object.keys(appConfig.apis).forEach(apiName => {
          console.log(`      - ${apiName}`);
        });
      }
      console.log('');
    }
  } finally {
    closeReadline();
  }
}

async function removeAppCommand() {
  try {
    log('Remove App', 'warning');
    console.log('');
    
    const config = readWorkerConfig();
    
    if (!config || config.parsed === false) {
      log('Could not read configuration from src/index.js', 'error');
      log('This command requires a valid configuration file', 'info');
      return;
    }
    
    const apps = listApps(config);
    
    if (apps.length === 0) {
      log('No apps configured', 'warning');
      return;
    }
    
    log('Available apps:', 'info');
    apps.forEach(app => console.log(`  - ${app}`));
    console.log('');
    
    const appName = await question('App name to remove: ');
    
    if (!apps.includes(appName)) {
      log(`App "${appName}" not found`, 'error');
      return;
    }
    
    const confirm = await question(`Are you sure you want to remove "${appName}"? (y/N): `);
    
    if (confirm.toLowerCase() !== 'y') {
      log('Operation cancelled', 'info');
      return;
    }
    
    log(`This command shows what to remove. You need to manually edit src/index.js`, 'warning');
    console.log('');
    log('Remove this section from src/index.js:', 'info');
    console.log('');
    console.log(`  ${appName}: {`);
    console.log(`    // ... entire app configuration`);
    console.log(`  },`);
    console.log('');
    
    log('Also remove associated secrets:', 'info');
    const appConfig = config[appName];
    if (appConfig.apis) {
      Object.values(appConfig.apis).forEach(api => {
        if (api.secret) {
          console.log(`  wrangler secret delete ${api.secret}`);
        }
      });
    }
    console.log('');
  } finally {
    closeReadline();
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];
  
  try {
    switch (command) {
      case 'init':
        await initCommand();
        break;
      
      case 'add-app':
        await addAppCommand();
        break;
      
      case 'list-apps':
        await listAppsCommand();
        break;
      
      case 'remove-app':
        await removeAppCommand();
        break;
      
      case 'validate':
        await validateCommand();
        break;
      
      case 'deploy':
        const dryRun = args.includes('--dry-run');
        await deployCommand(dryRun);
        break;
      
      case 'secrets':
        await secretsCommand(subcommand);
        break;
      
      case 'tail':
        await tailCommand();
        break;
      
      case 'test':
        await testCommand();
        break;
      
      case 'version':
      case '--version':
      case '-v':
        versionCommand();
        break;
      
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        helpCommand();
        break;
      
      default:
        log(`Unknown command: ${command}`, 'error');
        console.log('Run "statenv help" for usage information');
        closeReadline();
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    closeReadline();
    process.exit(1);
  }
}

main();
