#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
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
    const output = execSync(command, { encoding: 'utf-8' });
    if (!silent) console.log(output);
    return output;
  } catch (error) {
    if (!silent) log(`Command failed: ${command}`, 'error');
    throw error;
  }
}

// Commands

async function initCommand() {
  log('StatEnv Initialization', 'info');
  console.log('');
  
  // Check if already initialized
  if (existsSync('src/index.js')) {
    const overwrite = await question('StatEnv already initialized. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log('Initialization cancelled', 'warning');
      rl.close();
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
  
  rl.close();
}

async function addAppCommand() {
  log('Add New App', 'info');
  console.log('');
  
  // Get app details
  const appName = await question('App name (e.g., myblog): ');
  if (!appName || !/^[a-z][a-z0-9_-]*$/i.test(appName)) {
    log('Invalid app name. Use lowercase letters, numbers, hyphens, underscores.', 'error');
    rl.close();
    return;
  }
  
  const origins = await question('Allowed origins (comma-separated, e.g., https://myblog.com,http://localhost:3000): ');
  const originsList = origins.split(',').map(o => o.trim()).filter(Boolean);
  
  if (originsList.length === 0) {
    log('At least one origin is required', 'error');
    rl.close();
    return;
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
    if (!apiUrl.startsWith('http')) {
      log('Invalid URL', 'error');
      continue;
    }
    
    const method = await question('HTTP Method (GET/POST) [GET]: ');
    const httpMethod = method.toUpperCase() || 'GET';
    
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
  console.log(`    apis: ${JSON.stringify(apis, null, 6)}`);
  console.log(`  }`);
  console.log('');
  
  // List required secrets
  log('Required secrets (set with wrangler secret put):', 'info');
  Object.values(apis).forEach(api => {
    console.log(`  wrangler secret put ${api.secret}`);
  });
  console.log('');
  
  rl.close();
}

async function deployCommand() {
  log('Deploying StatEnv Worker', 'info');
  console.log('');
  
  // Check if wrangler is installed
  try {
    run('wrangler --version', true);
  } catch {
    log('Wrangler not found. Install with: npm install -g wrangler', 'error');
    rl.close();
    return;
  }
  
  // Check if logged in
  try {
    run('wrangler whoami', true);
  } catch {
    log('Not logged in to Cloudflare. Run: wrangler login', 'error');
    rl.close();
    return;
  }
  
  // Deploy
  try {
    log('Deploying...', 'info');
    run('wrangler deploy');
    log('Deployment successful!', 'success');
  } catch {
    log('Deployment failed', 'error');
  }
  
  rl.close();
}

async function secretsCommand(action) {
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
      rl.close();
      return;
    }
    
    log(`Setting secret: ${secretName}`, 'info');
    try {
      run(`wrangler secret put ${secretName}`);
      log('Secret set successfully', 'success');
    } catch {
      log('Failed to set secret', 'error');
    }
  }
  
  rl.close();
}

function helpCommand() {
  console.log(`
StatEnv CLI - Secure API Proxy for Static Apps

Usage: statenv <command> [options]

Commands:
  init              Initialize a new StatEnv project
  add-app           Add a new app configuration interactively
  deploy            Deploy Worker to Cloudflare
  secrets list      List all secrets
  secrets add       Add a new secret
  test              Run tests
  tail              Watch real-time logs
  help              Show this help message

Examples:
  statenv init                  # Initialize new project
  statenv add-app               # Add app interactively
  statenv deploy                # Deploy to Cloudflare
  statenv secrets list          # List all secrets
  statenv secrets add           # Add a new secret
  statenv tail                  # Watch logs
  statenv test                  # Run tests

Documentation:
  https://github.com/yourusername/statenv
  `);
  
  rl.close();
}

async function tailCommand() {
  log('Starting real-time log tail...', 'info');
  console.log('Press Ctrl+C to stop');
  console.log('');
  
  try {
    run('wrangler tail');
  } catch {
    log('Failed to tail logs', 'error');
  }
  
  rl.close();
}

async function testCommand() {
  log('Running tests...', 'info');
  console.log('');
  
  try {
    run('npm test');
    log('All tests passed!', 'success');
  } catch {
    log('Tests failed', 'error');
  }
  
  rl.close();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];
  
  switch (command) {
    case 'init':
      await initCommand();
      break;
    
    case 'add-app':
      await addAppCommand();
      break;
    
    case 'deploy':
      await deployCommand();
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
    
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      helpCommand();
      break;
    
    default:
      log(`Unknown command: ${command}`, 'error');
      console.log('Run "statenv help" for usage information');
      rl.close();
  }
}

main().catch(error => {
  log(`Error: ${error.message}`, 'error');
  rl.close();
  process.exit(1);
});
