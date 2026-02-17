import Conf from 'conf';
import chalk from 'chalk';

const config = new Conf({
  projectName: 'taxjar-cli',
  schema: {
    apiKey: {
      type: 'string',
      default: '',
    },
    baseUrl: {
      type: 'string',
      default: 'https://api.taxjar.com/v2',
    },
  },
});

export function getApiKey() {
  const apiKey = process.env.TAXJAR_API_KEY || config.get('apiKey');
  if (!apiKey) {
    console.error(chalk.red('Error: No API key configured.'));
    console.error(chalk.yellow('Set your API key with:'));
    console.error(chalk.cyan('  taxjar config set --api-key <your-api-key>'));
    console.error(chalk.yellow('Or set the TAXJAR_API_KEY environment variable.'));
    process.exit(1);
  }
  return apiKey;
}

export function setApiKey(key) {
  config.set('apiKey', key);
}

export function getBaseUrl() {
  return process.env.TAXJAR_BASE_URL || config.get('baseUrl');
}

export function showConfig() {
  const apiKey = config.get('apiKey') || process.env.TAXJAR_API_KEY || '';
  const baseUrl = getBaseUrl();
  const masked = apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : '(not set)';
  return {
    apiKey: masked,
    baseUrl,
    configPath: config.path,
  };
}

export default config;
