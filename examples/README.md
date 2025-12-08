# Amazon Invoice Parser - Examples

This directory contains practical examples demonstrating how to use the Amazon Invoice Parser in various scenarios.

## Available Examples

### 🔰 Basic Usage (`basic-usage.js`)

Demonstrates the fundamental usage of the parser to process a single invoice PDF.

```bash
node examples/basic-usage.js
```

**What it shows:**
- Initializing the parser
- Parsing a single invoice file
- Accessing extracted data (order number, date, items, totals)
- Handling validation results
- Displaying PDF metadata

### 📊 Batch Processing (`batch-processing.js`)

Shows how to process multiple invoice files and generate comprehensive reports.

```bash
node examples/batch-processing.js
```

**What it shows:**
- Processing multiple PDF files from a directory
- Generating summary reports
- Monthly spending analysis
- Category analysis
- Currency breakdown
- Exporting reports to JSON and CSV formats

### 💻 CLI Usage (`cli-usage.js`)

Demonstrates various command-line options and usage patterns.

```bash
node examples/cli-usage.js
```

**What it shows:**
- Basic CLI commands
- Different output formats (JSON, CSV)
- Batch processing from command line
- Creating sample files for testing
- Error handling and validation

## Running Examples

### Prerequisites

1. **Install dependencies** (from project root):
   ```bash
   npm install
   ```

2. **Prepare test data** (optional):
   - Place PDF files in `./test_data/` directory
   - Or examples will create sample files automatically

### Execute Examples

From the project root directory:

```bash
# Basic usage example
node examples/basic-usage.js

# Batch processing example
node examples/batch-processing.js

# CLI usage demonstration
node examples/cli-usage.js

# Run all examples
for example in examples/*.js; do
  if [ "$example" != "examples/README.md" ]; then
    echo "Running $example..."
    node "$example"
    echo ""
  fi
done
```

## Example Output

Each example provides detailed console output showing:
- Processing progress
- Extracted data
- Validation results
- Generated reports
- File creation confirmations

## Customization

### Using Your Own Data

1. **Single invoice**: Update the file path in `basic-usage.js`
2. **Batch processing**: Place your PDF files in `./test_data/` directory
3. **CLI examples**: Modify the command parameters in `cli-usage.js`

### Modifying Examples

Each example is self-contained and can be modified to:
- Use different input files
- Change output formats
- Add custom validation logic
- Integrate with other systems

## Integration Patterns

These examples demonstrate common integration patterns:

- **Web Applications**: Use programmatic API for server-side processing
- **CLI Tools**: Leverage command-line interface for batch operations
- **Data Analysis**: Generate reports for financial analysis
- **Automation**: Integrate into CI/CD pipelines or scheduled tasks

## Troubleshooting

### Common Issues

1. **File not found errors**: Ensure PDF files exist in specified paths
2. **Permission errors**: Check read/write permissions for input/output directories
3. **Memory issues**: For large batches, consider processing in chunks

### Debug Mode

Run examples with verbose output:

```bash
# Enable verbose logging
DEBUG=* node examples/basic-usage.js

# Or set environment variable
VERBOSE=1 node examples/batch-processing.js
```

## Contributing

When adding new examples:
1. Follow the existing code structure
2. Include comprehensive comments
3. Handle errors gracefully
4. Provide clear console output
5. Update this README

## Related Documentation

- [Main README](../README.md) - Complete installation and usage guide
- [API Reference](../docs/api-reference.md) - Detailed API documentation
- [Troubleshooting](../docs/troubleshooting.md) - Common issues and solutions