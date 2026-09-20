import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface CliConfig {
  apiKey?: string;
  baseUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.agentpay');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfig(): CliConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function setConfigKey(key: string, value: string): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    const config = getConfig();

    if (key === 'api-key' || key === 'apiKey') {
      config.apiKey = value;
    } else if (key === 'base-url' || key === 'baseUrl') {
      config.baseUrl = value;
    } else {
      throw new Error(`Unknown config key: ${key}. Valid keys: api-key, base-url`);
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch (err: any) {
    throw new Error(`Failed to save configuration: ${err.message}`);
  }
}

export function maskApiKey(key?: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
