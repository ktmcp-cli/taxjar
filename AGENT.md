# AGENT.md — TaxJar CLI Usage Guide for AI Agents

This document explains how an AI agent should use the `taxjar` CLI to interact with the TaxJar API for sales tax calculation, reporting, and transaction management.

## Setup

Before using any commands, ensure authentication is configured:

```bash
taxjar config set --api-key <TAXJAR_API_KEY>
# Or via environment variable:
export TAXJAR_API_KEY=<your-api-key>
```

Verify configuration:
```bash
taxjar config show
```

## Capabilities Overview

| Goal | Command |
|------|---------|
| Calculate sales tax | `taxjar tax calculate` |
| Look up tax rate by ZIP | `taxjar rates get` |
| See nexus states | `taxjar nexus list` |
| Browse product tax codes | `taxjar categories list` |
| List order transactions | `taxjar orders list` |
| Get specific order | `taxjar orders get <id>` |
| Create order record | `taxjar orders create` |
| List refunds | `taxjar refunds list` |
| Create refund record | `taxjar refunds create` |
| Validate US address | `taxjar validate address` |
| Validate VAT number | `taxjar validate vat` |

## Tax Calculation

Calculate how much tax to collect for a sale:

```bash
# US domestic sale from CA to NY
taxjar tax calculate \
  --from-country US --from-zip 94025 --from-state CA \
  --to-country US --to-zip 10001 --to-state NY \
  --amount 100.00 --shipping 5.00

# Get JSON output for parsing
taxjar tax calculate \
  --from-country US --from-zip 94025 --from-state CA \
  --to-country US --to-zip 10001 --to-state NY \
  --amount 100.00 --json
```

Key fields in JSON output:
- `amount_to_collect` — amount of tax to charge
- `rate` — effective tax rate (as decimal, e.g., 0.08875)
- `has_nexus` — whether seller has nexus in destination
- `freight_taxable` — whether shipping is taxable

## Rate Lookup

Look up tax rates for a specific location (without calculating an order):

```bash
taxjar rates get --zip 10001
taxjar rates get --zip 10001 --country US --state NY --city "New York"
taxjar rates get --zip 10001 --json
```

## Nexus Regions

List all states/regions where your account has sales tax nexus:

```bash
taxjar nexus list
taxjar nexus list --json
```

Use nexus list to understand where you're obligated to collect tax.

## Product Categories

Get available product tax codes (for line items requiring special tax treatment):

```bash
taxjar categories list
taxjar categories list --json
```

The `product_tax_code` field is used in line items to apply correct rates for items like clothing, food, software, etc.

## Order Transactions

### Listing Orders
```bash
taxjar orders list
taxjar orders list --from-date 2024-01-01 --to-date 2024-12-31
taxjar orders list --json
```

### Getting Order Details
```bash
taxjar orders get ORDER-123
taxjar orders get ORDER-123 --json
```

### Creating an Order
Record a completed order for tax reporting/filing:
```bash
taxjar orders create \
  --transaction-id ORDER-123 \
  --transaction-date 2024-06-15 \
  --to-country US --to-zip 10001 --to-state NY \
  --from-country US --from-zip 94025 --from-state CA \
  --amount 100.00 --shipping 5.00 --sales-tax 8.88
```

### Updating an Order
```bash
taxjar orders update ORDER-123 --sales-tax 9.00 --amount 110.00
```

### Deleting an Order
```bash
taxjar orders delete ORDER-123
```

## Refund Transactions

### Listing Refunds
```bash
taxjar refunds list
taxjar refunds list --from-date 2024-01-01 --to-date 2024-12-31
```

### Getting Refund Details
```bash
taxjar refunds get REFUND-123
```

### Creating a Refund
```bash
taxjar refunds create \
  --transaction-id REFUND-456 \
  --transaction-date 2024-06-20 \
  --transaction-reference-id ORDER-123 \
  --to-country US --to-zip 10001 --to-state NY \
  --amount -100.00 --shipping 0.00 --sales-tax -8.88
```

Note: Refund amounts should be negative values.

## Address Validation

Validate and standardize a US postal address:

```bash
taxjar validate address --country US --state NY --zip 10001 --city "New York" --street "1 World Trade Center"
```

## VAT Validation

Validate a EU VAT number:

```bash
taxjar validate vat GB123456789
```

## Output Modes

All commands support `--json` flag for machine-readable output:

```bash
taxjar tax calculate ... --json | jq '.amount_to_collect'
taxjar orders list --json | jq '.[].transaction_id'
taxjar nexus list --json | jq '.[].region_code'
```

## Common Agent Workflows

### Checkout Tax Calculation
1. Get product tax code from `taxjar categories list` if item needs special treatment
2. Run `taxjar tax calculate` with from/to addresses and order amount
3. Apply `amount_to_collect` as the tax charge at checkout

### End-of-Period Reporting
1. `taxjar orders list --from-date YYYY-MM-01 --to-date YYYY-MM-31 --json` to get order IDs
2. Loop through each with `taxjar orders get <id> --json` for details

### Tax Compliance Check
1. `taxjar nexus list` to see obligation states
2. `taxjar rates get --zip <zip>` for any specific rate lookups

## Error Handling

The CLI exits with code 1 on errors and prints a descriptive message. Common errors:
- `401 Unauthorized` — API key is invalid or missing
- `422 Unprocessable Entity` — Missing required parameters (check the parameter list)
- `429 Too Many Requests` — Rate limited, wait before retrying

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TAXJAR_API_KEY` | Your TaxJar API key (overrides stored config) |
| `TAXJAR_BASE_URL` | Override base URL (default: `https://api.taxjar.com/v2`) |
