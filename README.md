![Banner](https://raw.githubusercontent.com/ktmcp-cli/taxjar/main/banner.svg)

> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# TaxJar CLI

A production-ready command-line interface for the [TaxJar API](https://developers.taxjar.com/api/reference/), enabling sales tax calculation, rate lookups, transaction reporting, and filing automation directly from your terminal or scripts.

> **Unofficial CLI** — This project is not affiliated with or endorsed by TaxJar. It is an open-source tool built on the public TaxJar API.

## Features

- *Calculate sales tax* for any US or international transaction
- *Look up tax rates* by ZIP code or full address
- *Manage nexus regions* — see where you're obligated to collect tax
- *Browse product tax categories* with their tax codes
- *Record order transactions* for reporting and filing
- *Record refund transactions* with reference to original orders
- *Validate US addresses* and EU VAT numbers
- *JSON output mode* for scripting and automation
- *Beautiful terminal UX* with spinners, colors, and formatted tables
- *Secure config storage* — API keys stored in OS keychain, not plain text

## Why CLI > MCP

- Works in any terminal, any CI/CD pipeline, any script
- No JSON-RPC overhead, no daemon process
- Pipe output to `jq`, `grep`, `awk` — compose with anything
- Version-controlled in your shell history
- No special tooling or AI client required
- Faster iteration: run a command, get output, move on

## Installation

```bash
npm install -g @ktmcp-cli/taxjar
```

Or run without installing:

```bash
npx @ktmcp-cli/taxjar --help
```

## Authentication

Get your API key from [app.taxjar.com/account#api-access](https://app.taxjar.com/account#api-access).

```bash
# Store API key in config
taxjar config set --api-key YOUR_API_KEY

# Or use environment variable
export TAXJAR_API_KEY=YOUR_API_KEY
```

## Commands

### Configuration

```bash
taxjar config set --api-key <key>   # Save your TaxJar API key
taxjar config show                   # Display current configuration
```

### Tax Calculation

```bash
# Calculate tax for a US sale
taxjar tax calculate \
  --from-country US --from-zip 94025 --from-state CA \
  --to-country US --to-zip 10001 --to-state NY \
  --amount 100.00 --shipping 5.00

# Output as JSON
taxjar tax calculate ... --json
```

### Tax Rates

```bash
taxjar rates get --zip 10001                          # Get rates by ZIP
taxjar rates get --zip 10001 --country US --state NY  # With location details
taxjar rates summary                                   # Summary rates for all regions
```

### Nexus Regions

```bash
taxjar nexus list          # List all nexus regions
taxjar nexus list --json   # JSON output
```

### Product Categories

```bash
taxjar categories list          # List all product tax categories
taxjar categories list --json   # JSON output
```

### Orders

```bash
# List orders
taxjar orders list
taxjar orders list --from-date 2024-01-01 --to-date 2024-12-31

# Get a specific order
taxjar orders get <transaction-id>

# Create an order
taxjar orders create \
  --transaction-id ORDER-123 \
  --transaction-date 2024-06-15 \
  --to-country US --to-zip 10001 --to-state NY \
  --from-country US --from-zip 94025 --from-state CA \
  --amount 100.00 --shipping 5.00 --sales-tax 8.88

# Update an order
taxjar orders update <transaction-id> --amount 110.00 --sales-tax 9.50

# Delete an order
taxjar orders delete <transaction-id>
```

### Refunds

```bash
# List refunds
taxjar refunds list
taxjar refunds list --from-date 2024-01-01 --to-date 2024-12-31

# Get a specific refund
taxjar refunds get <transaction-id>

# Create a refund
taxjar refunds create \
  --transaction-id REFUND-456 \
  --transaction-date 2024-06-20 \
  --transaction-reference-id ORDER-123 \
  --to-country US --to-zip 10001 --to-state NY \
  --amount -100.00 --shipping 0.00 --sales-tax -8.88
```

### Validation

```bash
# Validate a US address
taxjar validate address --country US --state NY --zip 10001 --street "1 World Trade Center"

# Validate a VAT number
taxjar validate vat GB123456789
```

## Examples

### Calculate checkout tax

```bash
$ taxjar tax calculate \
    --from-country US --from-zip 94025 --from-state CA \
    --to-country US --to-zip 10001 --to-state NY \
    --amount 299.99 --shipping 9.99

✓ Tax calculated

Tax Calculation Result
──────────────────────
Order Amount:       $299.99
Taxable Amount:     $299.99
Shipping:           $9.99
Freight Taxable:    No
Tax Rate:           8.8750%
Tax to Collect:     $26.62
Has Nexus:          Yes
```

### Pipe JSON to jq

```bash
$ taxjar tax calculate \
    --from-country US --from-zip 94025 --from-state CA \
    --to-country US --to-zip 10001 --to-state NY \
    --amount 100 --json | jq '.amount_to_collect'

8.88
```

### List nexus states

```bash
$ taxjar nexus list

Country  Country Name    State/Region  Region Name
-------  -----------     ------------  -----------
US       United States   CA            California
US       United States   NY            New York
US       United States   TX            Texas
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TAXJAR_API_KEY` | Your TaxJar API key (overrides stored config) |
| `TAXJAR_BASE_URL` | Override API base URL (for sandbox: `https://api.sandbox.taxjar.com/v2`) |

### Using Sandbox

```bash
export TAXJAR_BASE_URL=https://api.sandbox.taxjar.com/v2
taxjar tax calculate ...
```

## Contributing

Pull requests are welcome. Please open an issue first to discuss proposed changes.

## License

MIT — see [LICENSE](./LICENSE) for details.

---

Part of the [KTMCP (Kill The MCP)](https://killthemcp.com) project — production-ready CLIs as alternatives to MCPs for every major API.
