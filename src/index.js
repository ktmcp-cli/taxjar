import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { setApiKey, showConfig } from './config.js';
import {
  calculateTax,
  getRates,
  getNexusRegions,
  getCategories,
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  listRefunds,
  getRefund,
  createRefund,
  validateAddress,
  validateVat,
  getSummaryRates,
} from './api.js';

const program = new Command();

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printSuccess(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function printTable(data, columns) {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  const colWidths = {};
  columns.forEach(col => {
    colWidths[col.key] = col.label.length;
    data.forEach(row => {
      const val = String(row[col.key] ?? '');
      colWidths[col.key] = Math.max(colWidths[col.key], val.length);
    });
  });

  const header = columns.map(col => col.label.padEnd(colWidths[col.key])).join('  ');
  const separator = columns.map(col => '-'.repeat(colWidths[col.key])).join('  ');

  console.log(chalk.bold.cyan(header));
  console.log(chalk.dim(separator));
  data.forEach(row => {
    console.log(columns.map(col => String(row[col.key] ?? '').padEnd(colWidths[col.key])).join('  '));
  });
}

// ─── Config Commands ───────────────────────────────────────────────────────────

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .requiredOption('--api-key <key>', 'TaxJar API key')
  .action((options) => {
    setApiKey(options.apiKey);
    printSuccess('API key saved successfully.');
    console.log(chalk.dim('You can also set TAXJAR_API_KEY as an environment variable.'));
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const cfg = showConfig();
    console.log(chalk.bold('TaxJar CLI Configuration'));
    console.log(chalk.dim('─────────────────────────'));
    console.log(`API Key:     ${chalk.cyan(cfg.apiKey)}`);
    console.log(`Base URL:    ${chalk.cyan(cfg.baseUrl)}`);
    console.log(`Config file: ${chalk.dim(cfg.configPath)}`);
  });

// ─── Tax Commands ──────────────────────────────────────────────────────────────

const taxCmd = program.command('tax').description('Tax calculation commands');

taxCmd
  .command('calculate')
  .description('Calculate sales tax for an order')
  .requiredOption('--from-country <code>', 'Origin country code (e.g. US)')
  .requiredOption('--from-zip <zip>', 'Origin postal code')
  .requiredOption('--from-state <state>', 'Origin state code (e.g. CA)')
  .requiredOption('--to-country <code>', 'Destination country code (e.g. US)')
  .requiredOption('--to-zip <zip>', 'Destination postal code')
  .requiredOption('--to-state <state>', 'Destination state code (e.g. NY)')
  .requiredOption('--amount <amount>', 'Order amount (subtotal, excluding shipping)')
  .option('--shipping <amount>', 'Shipping amount', '0')
  .option('--from-city <city>', 'Origin city')
  .option('--from-street <street>', 'Origin street address')
  .option('--to-city <city>', 'Destination city')
  .option('--to-street <street>', 'Destination street address')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Calculating tax...').start();
    try {
      const params = {
        from_country: options.fromCountry,
        from_zip: options.fromZip,
        from_state: options.fromState,
        to_country: options.toCountry,
        to_zip: options.toZip,
        to_state: options.toState,
        amount: parseFloat(options.amount),
        shipping: parseFloat(options.shipping),
      };
      if (options.fromCity) params.from_city = options.fromCity;
      if (options.fromStreet) params.from_street = options.fromStreet;
      if (options.toCity) params.to_city = options.toCity;
      if (options.toStreet) params.to_street = options.toStreet;

      const result = await calculateTax(params);
      spinner.succeed('Tax calculated');

      if (options.json) {
        printJson(result);
        return;
      }

      console.log('');
      console.log(chalk.bold('Tax Calculation Result'));
      console.log(chalk.dim('──────────────────────'));
      console.log(`Order Amount:       ${chalk.white('$' + options.amount)}`);
      console.log(`Taxable Amount:     ${chalk.white('$' + result.taxable_amount)}`);
      console.log(`Shipping:           ${chalk.white('$' + options.shipping)}`);
      console.log(`Freight Taxable:    ${chalk.white(result.freight_taxable ? 'Yes' : 'No')}`);
      console.log(`Tax Rate:           ${chalk.cyan((result.rate * 100).toFixed(4) + '%')}`);
      console.log(`Tax to Collect:     ${chalk.green.bold('$' + result.amount_to_collect)}`);
      console.log(`Has Nexus:          ${chalk.white(result.has_nexus ? 'Yes' : 'No')}`);

      if (result.breakdown) {
        console.log('');
        console.log(chalk.bold('Breakdown'));
        console.log(chalk.dim('─────────'));
        if (result.breakdown.state_tax_collectable) {
          console.log(`State Tax:          ${chalk.white('$' + result.breakdown.state_tax_collectable)}`);
        }
        if (result.breakdown.county_tax_collectable) {
          console.log(`County Tax:         ${chalk.white('$' + result.breakdown.county_tax_collectable)}`);
        }
        if (result.breakdown.city_tax_collectable) {
          console.log(`City Tax:           ${chalk.white('$' + result.breakdown.city_tax_collectable)}`);
        }
        if (result.breakdown.special_district_tax_collectable) {
          console.log(`Special District:   ${chalk.white('$' + result.breakdown.special_district_tax_collectable)}`);
        }
      }
    } catch (error) {
      spinner.fail('Tax calculation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Rates Commands ────────────────────────────────────────────────────────────

const ratesCmd = program.command('rates').description('Tax rate lookup commands');

ratesCmd
  .command('get')
  .description('Get tax rates for a location')
  .requiredOption('--zip <zip>', 'Postal code')
  .option('--country <code>', 'Country code', 'US')
  .option('--city <city>', 'City name')
  .option('--street <street>', 'Street address')
  .option('--state <state>', 'State code')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora(`Fetching rates for ${options.zip}...`).start();
    try {
      const params = { country: options.country };
      if (options.city) params.city = options.city;
      if (options.street) params.street = options.street;
      if (options.state) params.state = options.state;

      const rate = await getRates(options.zip, params);
      spinner.succeed('Rates retrieved');

      if (options.json) {
        printJson(rate);
        return;
      }

      console.log('');
      console.log(chalk.bold(`Tax Rates for ${options.zip} (${options.country})`));
      console.log(chalk.dim('──────────────────────────────────'));
      if (rate.city) console.log(`City:               ${chalk.white(rate.city)}`);
      if (rate.state) console.log(`State:              ${chalk.white(rate.state)}`);
      if (rate.county) console.log(`County:             ${chalk.white(rate.county)}`);
      console.log('');
      if (rate.state_rate) console.log(`State Rate:         ${chalk.cyan((parseFloat(rate.state_rate) * 100).toFixed(4) + '%')}`);
      if (rate.county_rate) console.log(`County Rate:        ${chalk.cyan((parseFloat(rate.county_rate) * 100).toFixed(4) + '%')}`);
      if (rate.city_rate) console.log(`City Rate:          ${chalk.cyan((parseFloat(rate.city_rate) * 100).toFixed(4) + '%')}`);
      if (rate.combined_district_rate) console.log(`District Rate:      ${chalk.cyan((parseFloat(rate.combined_district_rate) * 100).toFixed(4) + '%')}`);
      console.log(`Combined Rate:      ${chalk.green.bold((parseFloat(rate.combined_rate) * 100).toFixed(4) + '%')}`);
      if (rate.freight_taxable !== undefined) {
        console.log(`Freight Taxable:    ${chalk.white(rate.freight_taxable ? 'Yes' : 'No')}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch rates');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

ratesCmd
  .command('summary')
  .description('Get a summary of tax rates for all regions')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Fetching summary rates...').start();
    try {
      const rates = await getSummaryRates();
      spinner.succeed(`Retrieved ${rates.length} region summaries`);

      if (options.json) {
        printJson(rates);
        return;
      }

      printTable(rates, [
        { key: 'country_code', label: 'Country' },
        { key: 'country', label: 'Country Name' },
        { key: 'region_code', label: 'Region' },
        { key: 'region', label: 'Region Name' },
        { key: 'minimum_rate.rate', label: 'Min Rate' },
        { key: 'average_rate.rate', label: 'Avg Rate' },
      ]);
    } catch (error) {
      spinner.fail('Failed to fetch summary rates');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Nexus Commands ────────────────────────────────────────────────────────────

const nexusCmd = program.command('nexus').description('Nexus region commands');

nexusCmd
  .command('list')
  .description('List nexus regions for your account')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Fetching nexus regions...').start();
    try {
      const regions = await getNexusRegions();
      spinner.succeed(`Found ${regions.length} nexus region(s)`);

      if (options.json) {
        printJson(regions);
        return;
      }

      printTable(regions, [
        { key: 'country_code', label: 'Country' },
        { key: 'country', label: 'Country Name' },
        { key: 'region_code', label: 'State/Region' },
        { key: 'region', label: 'Region Name' },
      ]);
    } catch (error) {
      spinner.fail('Failed to fetch nexus regions');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Categories Commands ───────────────────────────────────────────────────────

const categoriesCmd = program.command('categories').description('Product tax category commands');

categoriesCmd
  .command('list')
  .description('List all product tax categories')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Fetching categories...').start();
    try {
      const categories = await getCategories();
      spinner.succeed(`Found ${categories.length} categories`);

      if (options.json) {
        printJson(categories);
        return;
      }

      printTable(categories, [
        { key: 'product_tax_code', label: 'Tax Code' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
      ]);
    } catch (error) {
      spinner.fail('Failed to fetch categories');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Orders Commands ───────────────────────────────────────────────────────────

const ordersCmd = program.command('orders').description('Order transaction commands');

ordersCmd
  .command('list')
  .description('List order transactions')
  .option('--from-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--to-date <date>', 'End date (YYYY-MM-DD)')
  .option('--status <status>', 'Filter by status (authorized, captured, refunded, voided)')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Fetching orders...').start();
    try {
      const params = {};
      if (options.fromDate) params.from_transaction_date = options.fromDate;
      if (options.toDate) params.to_transaction_date = options.toDate;
      if (options.status) params.status = options.status;

      const orders = await listOrders(params);
      spinner.succeed(`Found ${orders.length} order(s)`);

      if (options.json) {
        printJson(orders);
        return;
      }

      if (orders.length === 0) {
        console.log(chalk.yellow('No orders found for the given criteria.'));
        return;
      }

      printTable(orders.map(id => ({ transaction_id: id })), [
        { key: 'transaction_id', label: 'Transaction ID' },
      ]);
      console.log(chalk.dim('\nUse `taxjar orders get <transaction-id>` to see order details.'));
    } catch (error) {
      spinner.fail('Failed to fetch orders');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

ordersCmd
  .command('get <transaction-id>')
  .description('Get a specific order transaction')
  .option('--json', 'Output raw JSON')
  .action(async (transactionId, options) => {
    const spinner = ora(`Fetching order ${transactionId}...`).start();
    try {
      const order = await getOrder(transactionId);
      spinner.succeed('Order retrieved');

      if (options.json) {
        printJson(order);
        return;
      }

      console.log('');
      console.log(chalk.bold(`Order: ${order.transaction_id}`));
      console.log(chalk.dim('──────────────────────────────────'));
      console.log(`Transaction Date:   ${chalk.white(order.transaction_date)}`);
      console.log(`Amount:             ${chalk.white('$' + order.amount)}`);
      console.log(`Shipping:           ${chalk.white('$' + order.shipping)}`);
      console.log(`Sales Tax:          ${chalk.green('$' + order.sales_tax)}`);
      if (order.to_country) console.log(`Destination:        ${chalk.white(`${order.to_city || ''}, ${order.to_state || ''} ${order.to_zip || ''} ${order.to_country}`.trim())}`);
      if (order.from_country) console.log(`Origin:             ${chalk.white(`${order.from_city || ''}, ${order.from_state || ''} ${order.from_zip || ''} ${order.from_country}`.trim())}`);

      if (order.line_items && order.line_items.length > 0) {
        console.log('');
        console.log(chalk.bold('Line Items'));
        console.log(chalk.dim('──────────'));
        printTable(order.line_items, [
          { key: 'id', label: 'ID' },
          { key: 'description', label: 'Description' },
          { key: 'quantity', label: 'Qty' },
          { key: 'unit_price', label: 'Unit Price' },
          { key: 'sales_tax', label: 'Sales Tax' },
        ]);
      }
    } catch (error) {
      spinner.fail('Failed to fetch order');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

ordersCmd
  .command('create')
  .description('Create an order transaction')
  .requiredOption('--transaction-id <id>', 'Unique transaction ID')
  .requiredOption('--transaction-date <date>', 'Transaction date (YYYY-MM-DD)')
  .requiredOption('--to-country <code>', 'Destination country code')
  .requiredOption('--to-zip <zip>', 'Destination postal code')
  .requiredOption('--to-state <state>', 'Destination state code')
  .requiredOption('--amount <amount>', 'Total order amount')
  .requiredOption('--shipping <amount>', 'Shipping amount')
  .requiredOption('--sales-tax <tax>', 'Sales tax collected')
  .option('--from-country <code>', 'Origin country code')
  .option('--from-zip <zip>', 'Origin postal code')
  .option('--from-state <state>', 'Origin state code')
  .option('--to-city <city>', 'Destination city')
  .option('--from-city <city>', 'Origin city')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Creating order...').start();
    try {
      const params = {
        transaction_id: options.transactionId,
        transaction_date: options.transactionDate,
        to_country: options.toCountry,
        to_zip: options.toZip,
        to_state: options.toState,
        amount: parseFloat(options.amount),
        shipping: parseFloat(options.shipping),
        sales_tax: parseFloat(options.salesTax),
      };
      if (options.fromCountry) params.from_country = options.fromCountry;
      if (options.fromZip) params.from_zip = options.fromZip;
      if (options.fromState) params.from_state = options.fromState;
      if (options.toCity) params.to_city = options.toCity;
      if (options.fromCity) params.from_city = options.fromCity;

      const order = await createOrder(params);
      spinner.succeed('Order created successfully');

      if (options.json) {
        printJson(order);
        return;
      }

      console.log(`Transaction ID:  ${chalk.cyan(order.transaction_id)}`);
      console.log(`Amount:          ${chalk.white('$' + order.amount)}`);
      console.log(`Sales Tax:       ${chalk.green('$' + order.sales_tax)}`);
    } catch (error) {
      spinner.fail('Failed to create order');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

ordersCmd
  .command('update <transaction-id>')
  .description('Update an existing order transaction')
  .option('--amount <amount>', 'Total order amount')
  .option('--shipping <amount>', 'Shipping amount')
  .option('--sales-tax <tax>', 'Sales tax collected')
  .option('--transaction-date <date>', 'Transaction date (YYYY-MM-DD)')
  .option('--json', 'Output raw JSON')
  .action(async (transactionId, options) => {
    const spinner = ora(`Updating order ${transactionId}...`).start();
    try {
      const params = { transaction_id: transactionId };
      if (options.amount) params.amount = parseFloat(options.amount);
      if (options.shipping) params.shipping = parseFloat(options.shipping);
      if (options.salesTax) params.sales_tax = parseFloat(options.salesTax);
      if (options.transactionDate) params.transaction_date = options.transactionDate;

      const order = await updateOrder(transactionId, params);
      spinner.succeed('Order updated successfully');

      if (options.json) {
        printJson(order);
        return;
      }

      console.log(`Transaction ID:  ${chalk.cyan(order.transaction_id)}`);
      console.log(`Amount:          ${chalk.white('$' + order.amount)}`);
      console.log(`Sales Tax:       ${chalk.green('$' + order.sales_tax)}`);
    } catch (error) {
      spinner.fail('Failed to update order');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

ordersCmd
  .command('delete <transaction-id>')
  .description('Delete an order transaction')
  .option('--json', 'Output raw JSON')
  .action(async (transactionId, options) => {
    const spinner = ora(`Deleting order ${transactionId}...`).start();
    try {
      const order = await deleteOrder(transactionId);
      spinner.succeed('Order deleted successfully');

      if (options.json) {
        printJson(order);
        return;
      }

      console.log(`Deleted transaction: ${chalk.cyan(transactionId)}`);
    } catch (error) {
      spinner.fail('Failed to delete order');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Refunds Commands ──────────────────────────────────────────────────────────

const refundsCmd = program.command('refunds').description('Refund transaction commands');

refundsCmd
  .command('list')
  .description('List refund transactions')
  .option('--from-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--to-date <date>', 'End date (YYYY-MM-DD)')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Fetching refunds...').start();
    try {
      const params = {};
      if (options.fromDate) params.from_transaction_date = options.fromDate;
      if (options.toDate) params.to_transaction_date = options.toDate;

      const refunds = await listRefunds(params);
      spinner.succeed(`Found ${refunds.length} refund(s)`);

      if (options.json) {
        printJson(refunds);
        return;
      }

      if (refunds.length === 0) {
        console.log(chalk.yellow('No refunds found for the given criteria.'));
        return;
      }

      printTable(refunds.map(id => ({ transaction_id: id })), [
        { key: 'transaction_id', label: 'Transaction ID' },
      ]);
    } catch (error) {
      spinner.fail('Failed to fetch refunds');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

refundsCmd
  .command('get <transaction-id>')
  .description('Get a specific refund transaction')
  .option('--json', 'Output raw JSON')
  .action(async (transactionId, options) => {
    const spinner = ora(`Fetching refund ${transactionId}...`).start();
    try {
      const refund = await getRefund(transactionId);
      spinner.succeed('Refund retrieved');

      if (options.json) {
        printJson(refund);
        return;
      }

      console.log('');
      console.log(chalk.bold(`Refund: ${refund.transaction_id}`));
      console.log(chalk.dim('──────────────────────────────────'));
      console.log(`Transaction Date:   ${chalk.white(refund.transaction_date)}`);
      console.log(`Refund Amount:      ${chalk.white('$' + refund.amount)}`);
      console.log(`Sales Tax Refund:   ${chalk.green('$' + refund.sales_tax)}`);
    } catch (error) {
      spinner.fail('Failed to fetch refund');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

refundsCmd
  .command('create')
  .description('Create a refund transaction')
  .requiredOption('--transaction-id <id>', 'Unique refund transaction ID')
  .requiredOption('--transaction-date <date>', 'Transaction date (YYYY-MM-DD)')
  .requiredOption('--transaction-reference-id <id>', 'Original order transaction ID')
  .requiredOption('--to-country <code>', 'Destination country code')
  .requiredOption('--to-zip <zip>', 'Destination postal code')
  .requiredOption('--to-state <state>', 'Destination state code')
  .requiredOption('--amount <amount>', 'Refund amount (negative value)')
  .requiredOption('--shipping <amount>', 'Shipping amount (negative if refunding)')
  .requiredOption('--sales-tax <tax>', 'Sales tax to refund (negative value)')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Creating refund...').start();
    try {
      const params = {
        transaction_id: options.transactionId,
        transaction_date: options.transactionDate,
        transaction_reference_id: options.transactionReferenceId,
        to_country: options.toCountry,
        to_zip: options.toZip,
        to_state: options.toState,
        amount: parseFloat(options.amount),
        shipping: parseFloat(options.shipping),
        sales_tax: parseFloat(options.salesTax),
      };

      const refund = await createRefund(params);
      spinner.succeed('Refund created successfully');

      if (options.json) {
        printJson(refund);
        return;
      }

      console.log(`Transaction ID:  ${chalk.cyan(refund.transaction_id)}`);
      console.log(`Refund Amount:   ${chalk.white('$' + refund.amount)}`);
      console.log(`Sales Tax:       ${chalk.green('$' + refund.sales_tax)}`);
    } catch (error) {
      spinner.fail('Failed to create refund');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Validate Commands ─────────────────────────────────────────────────────────

const validateCmd = program.command('validate').description('Validation commands');

validateCmd
  .command('address')
  .description('Validate and standardize a US address')
  .requiredOption('--country <code>', 'Country code (US)')
  .option('--state <state>', 'State code')
  .option('--zip <zip>', 'ZIP code')
  .option('--city <city>', 'City')
  .option('--street <street>', 'Street address')
  .option('--json', 'Output raw JSON')
  .action(async (options) => {
    const spinner = ora('Validating address...').start();
    try {
      const params = { country: options.country };
      if (options.state) params.state = options.state;
      if (options.zip) params.zip = options.zip;
      if (options.city) params.city = options.city;
      if (options.street) params.street = options.street;

      const addresses = await validateAddress(params);
      spinner.succeed(`Found ${addresses.length} address match(es)`);

      if (options.json) {
        printJson(addresses);
        return;
      }

      addresses.forEach((addr, i) => {
        console.log('');
        console.log(chalk.bold(`Match ${i + 1}:`));
        if (addr.street) console.log(`Street:  ${chalk.white(addr.street)}`);
        if (addr.city) console.log(`City:    ${chalk.white(addr.city)}`);
        if (addr.state) console.log(`State:   ${chalk.white(addr.state)}`);
        if (addr.zip) console.log(`ZIP:     ${chalk.white(addr.zip)}`);
        if (addr.country) console.log(`Country: ${chalk.white(addr.country)}`);
      });
    } catch (error) {
      spinner.fail('Address validation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

validateCmd
  .command('vat <vat-number>')
  .description('Validate a VAT identification number')
  .option('--json', 'Output raw JSON')
  .action(async (vatNumber, options) => {
    const spinner = ora(`Validating VAT: ${vatNumber}...`).start();
    try {
      const result = await validateVat(vatNumber);
      spinner.succeed('VAT validation complete');

      if (options.json) {
        printJson(result);
        return;
      }

      console.log('');
      console.log(chalk.bold('VAT Validation Result'));
      console.log(chalk.dim('─────────────────────'));
      console.log(`VAT Number:  ${chalk.white(result.vat_number)}`);
      console.log(`Valid:       ${result.valid ? chalk.green('Yes') : chalk.red('No')}`);
      if (result.name) console.log(`Name:        ${chalk.white(result.name)}`);
      if (result.country_code) console.log(`Country:     ${chalk.white(result.country_code)}`);
    } catch (error) {
      spinner.fail('VAT validation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Program Setup ─────────────────────────────────────────────────────────────

program
  .name('taxjar')
  .description('TaxJar CLI - Sales tax calculation and reporting')
  .version('1.0.0');

export { program };
