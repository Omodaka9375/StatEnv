/**
 * Config Management Utilities
 * Handles reading/writing StatEnv configuration files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config file locations
const CONFIG_FILES = ['.statenvrc', 'statenv.config.json', '.statenv.json'];

/**
 * Find and read the config file
 */
export function readConfig() {
  for (const configFile of CONFIG_FILES) {
    const configPath = join(process.cwd(), configFile);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        throw new Error(`Invalid config file ${configFile}: ${error.message}`);
      }
    }
  }
  return null;
}

/**
 * Write config to file
 */
export function writeConfig(config, filename = '.statenvrc') {
  const configPath = join(process.cwd(), filename);
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return configPath;
  } catch (error) {
    throw new Error(`Failed to write config: ${error.message}`);
  }
}

/**
 * Read the main worker config from src/index.js
 */
export function readWorkerConfig() {
  const workerPath = join(process.cwd(), 'src', 'index.js');

  if (!existsSync(workerPath)) {
    return null;
  }

  try {
    const content = readFileSync(workerPath, 'utf-8');

    // Extract APP_CONFIG using regex
    const configMatch = content.match(/const\s+APP_CONFIG\s*=\s*({[\s\S]*?});/);

    if (!configMatch) {
      return null;
    }

    // Parse the config (this is a simplified approach)
    // In production, you might want to use a proper JS parser
    const configStr = configMatch[1];

    // Remove comments
    const cleanedConfig = configStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Try to parse as JSON-like structure
    // This is a hack - better to use actual JS parser
    try {
      // Replace single quotes with double quotes
      const jsonStr = cleanedConfig.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');

      return JSON.parse(jsonStr);
    } catch {
      // If direct parsing fails, return raw match for validation purposes
      return { raw: configStr, parsed: false };
    }
  } catch (error) {
    throw new Error(`Failed to read worker config: ${error.message}`);
  }
}

/**
 * Validate configuration structure
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate each app
  for (const [appName, appConfig] of Object.entries(config)) {
    // Validate app name
    if (!/^[a-z][a-z0-9_-]*$/i.test(appName)) {
      errors.push(`Invalid app name: ${appName}`);
    }

    // Validate origins
    if (!appConfig.origins || !Array.isArray(appConfig.origins)) {
      errors.push(`${appName}: origins must be an array`);
    } else if (appConfig.origins.length === 0) {
      errors.push(`${appName}: at least one origin is required`);
    } else {
      // Validate each origin
      for (const origin of appConfig.origins) {
        try {
          new URL(origin);
        } catch {
          errors.push(`${appName}: invalid origin URL: ${origin}`);
        }
      }
    }

    // Validate APIs
    if (!appConfig.apis || typeof appConfig.apis !== 'object') {
      errors.push(`${appName}: apis must be an object`);
      continue;
    }

    if (Object.keys(appConfig.apis).length === 0) {
      warnings.push(`${appName}: no APIs defined`);
    }

    // Validate each API
    for (const [apiName, apiConfig] of Object.entries(appConfig.apis)) {
      const prefix = `${appName}.${apiName}`;

      // Validate API name
      if (!/^[a-z][a-z0-9_]*$/i.test(apiName)) {
        errors.push(`${prefix}: invalid API name`);
      }

      // Validate required fields
      if (!apiConfig.url) {
        errors.push(`${prefix}: url is required`);
      } else {
        try {
          new URL(apiConfig.url);
        } catch {
          errors.push(`${prefix}: invalid URL: ${apiConfig.url}`);
        }
      }

      if (!apiConfig.secret) {
        errors.push(`${prefix}: secret is required`);
      } else if (!/^[A-Z][A-Z0-9_]*$/.test(apiConfig.secret)) {
        warnings.push(`${prefix}: secret name should be UPPERCASE_WITH_UNDERSCORES`);
      }

      if (!apiConfig.method) {
        warnings.push(`${prefix}: method not specified, defaults to GET`);
      } else if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(apiConfig.method)) {
        errors.push(`${prefix}: invalid method: ${apiConfig.method}`);
      }

      // Validate GET params
      if (apiConfig.method === 'GET' && apiConfig.params) {
        if (!Array.isArray(apiConfig.params)) {
          errors.push(`${prefix}: params must be an array`);
        }
      }

      // Validate POST body fields
      if (['POST', 'PUT', 'PATCH'].includes(apiConfig.method) && apiConfig.bodyFields) {
        if (!Array.isArray(apiConfig.bodyFields)) {
          errors.push(`${prefix}: bodyFields must be an array`);
        }
      }

      // Validate cache
      if (apiConfig.cache !== undefined) {
        if (typeof apiConfig.cache !== 'number' || apiConfig.cache < 0) {
          errors.push(`${prefix}: cache must be a positive number`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get list of apps from config
 */
export function listApps(config) {
  if (!config) return [];
  return Object.keys(config);
}

/**
 * Get app configuration
 */
export function getApp(config, appName) {
  if (!config) return null;
  return config[appName] || null;
}

/**
 * Add or update app in config
 */
export function setApp(config, appName, appConfig) {
  return {
    ...config,
    [appName]: appConfig,
  };
}

/**
 * Remove app from config
 */
export function removeApp(config, appName) {
  const newConfig = { ...config };
  delete newConfig[appName];
  return newConfig;
}
