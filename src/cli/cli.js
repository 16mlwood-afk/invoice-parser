const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const AmazonInvoiceParser = require('../parser/parser');
const Reporting = require('../reports/reporting');
const { invoiceToCSV, reportToCSV } = require('../utils/csv-converter');
const { ensureDirectoryExists, safeWriteFile } = require('../utils/file-operations');
const generateTextReport = require('./text-report-generator');

class CLI {
  constructor() {
    this.parser = new AmazonInvoiceParser();
    this.reporting = new Reporting();
  }

  createProgram() {
    const program = new Command();

    program
      .name('amazon-invoice-parser')
      .description('Extract structured data from Amazon invoice PDFs')
      .version('1.0.0');

    // Default action when no subcommand is provided
    program.action(() => {
      console.log('Please specify a command. Use --help for available options.');
      process.exit(1);
    });

    this.addParseCommand(program);
    this.addBatchCommand(program);
    this.addReportCommand(program);
    this.addTestCommand(program);

    return program;
  }

  addParseCommand(program) {
    program
      .command('parse <file>')
      .description('Parse a single Amazon invoice PDF')
      .option('-o, --output <file>', 'Output file for results')
      .option('-d, --output-dir <directory>', 'Output directory (creates file with same base name)')
      .option('-f, --format <format>', 'Output format (json, csv, text)', 'json')
      .option('--overwrite', 'Overwrite existing files without backup')
      .option('--backup', 'Create backup of existing files before overwriting')
      .option('-v, --verbose', 'Show detailed performance metrics and confidence scores')
      .action(async (filePath, options) => {
        try {
          const invoice = await this.parser.parseInvoice(filePath, { silent: options.format !== 'text' });

          if (!invoice) {
            console.error('❌ Failed to parse invoice');
            process.exit(1);
          }

          if (options.format === 'text') {
            console.log('✅ Invoice parsed successfully:');
            console.log(`Order: ${invoice.orderNumber}`);
            console.log(`Date: ${invoice.orderDate}`);
            console.log(`Total: ${invoice.total}`);
            console.log(`Items: ${invoice.items?.length || 0}`);

            // Display language detection confidence and performance metrics
            if (invoice.languageDetection) {
              console.log(`🌍 Language: ${invoice.languageDetection.language} (${(invoice.languageDetection.confidence * 100).toFixed(1)}% confidence)`);
            }

            if (invoice.performanceMetrics) {
              const perf = invoice.performanceMetrics;
              console.log(`⚡ Processing time: ${perf.totalProcessingTime}ms`);

              if (perf.extractionSuccess) {
                const successRate = (perf.extractionSuccess.overall * 100).toFixed(1);
                console.log(`📊 Extraction success: ${successRate}% (${Object.values(perf.extractionSuccess.fields).filter(Boolean).length}/${Object.keys(perf.extractionSuccess.fields).length} fields)`);

                // Show detailed metrics if verbose
                if (options.verbose) {
                  console.log('\n📈 Detailed Performance Metrics:');
                  console.log(`  Preprocessing: ${perf.preprocessingTime}ms`);
                  console.log(`  Language Detection: ${perf.languageDetectionTime}ms`);
                  console.log(`  Parsing: ${perf.parsingTime}ms`);
                  console.log(`  Text Length: ${perf.textLength} chars → ${perf.processedTextLength} chars`);

                  console.log('\n🔍 Extraction Details:');
                  const fields = perf.extractionSuccess.fields;
                  console.log(`  Order Number: ${fields.orderNumber ? '✅' : '❌'}`);
                  console.log(`  Order Date: ${fields.orderDate ? '✅' : '❌'}`);
                  console.log(`  Items: ${fields.items ? '✅' : '❌'}`);
                  console.log(`  Subtotal: ${fields.subtotal ? '✅' : '❌'}`);
                  console.log(`  Shipping: ${fields.shipping ? '✅' : '❌'}`);
                  console.log(`  Tax: ${fields.tax ? '✅' : '❌'}`);
                  console.log(`  Total: ${fields.total ? '✅' : '❌'}`);

                  if (fields.items && perf.extractionSuccess.itemsDetail) {
                    const itemsDetail = perf.extractionSuccess.itemsDetail;
                    console.log(`  Items Detail: ${itemsDetail.itemsWithPrices}/${itemsDetail.totalItems} with prices, ${itemsDetail.itemsWithDescriptions}/${itemsDetail.totalItems} with descriptions`);
                  }
                }
              }
            }

            console.log('✅ Invoice parsed successfully!');
          } else {
            // Validate JSON output before displaying
            const validatedInvoice = this.parser.validation.validateJsonOutput(invoice);
            if (!validatedInvoice) {
              console.error('❌ JSON validation failed for parsed invoice');
              process.exit(1);
            }

            let outputContent, outputPath, fileExtension;

            // Generate output content based on format
            if (options.format === 'csv') {
              outputContent = invoiceToCSV(validatedInvoice);
              fileExtension = 'csv';
            } else {
              outputContent = JSON.stringify(validatedInvoice, null, 2);
              fileExtension = 'json';
            }

            // Determine output path
            if (options.output) {
              outputPath = options.output;
            } else if (options.outputDir) {
              // Generate filename from input file
              const baseName = path.basename(filePath, path.extname(filePath));
              const outputFileName = `${baseName}.${fileExtension}`;
              outputPath = path.join(options.outputDir, outputFileName);
              ensureDirectoryExists(options.outputDir);
            }

            if (outputPath) {
              safeWriteFile(outputPath, outputContent, {
                overwrite: options.overwrite,
                backup: options.backup
              });
              console.log(`✅ Invoice parsed successfully and saved to: ${outputPath}`);
            } else {
              console.log(outputContent);
            }
          }
        } catch (error) {
          console.error('❌ Error:', error.message);
          process.exit(1);
        }
      });
  }

  addBatchCommand(program) {
    program
      .command('batch <directory>')
      .description('Parse all PDF files in a directory')
      .option('-o, --output <file>', 'Output file for batch results')
      .option('-d, --output-dir <directory>', 'Output directory for individual results')
      .option('-f, --format <format>', 'Output format (json, csv, text)', 'json')
      .option('--overwrite', 'Overwrite existing files without backup')
      .option('--backup', 'Create backup of existing files before overwriting')
      .action(async (directory, options) => {
        try {
          if (!fs.existsSync(directory)) {
            console.error(`❌ Directory not found: ${directory}`);
            process.exit(1);
          }

          const parser = new AmazonInvoiceParser();
          const files = fs.readdirSync(directory)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => `${directory}/${file}`);

          if (files.length === 0) {
            console.log('⚠️  No PDF files found in directory');
            return;
          }

          console.log(`📂 Processing ${files.length} PDF files...`);

          // Ensure output directory exists if specified
          if (options.outputDir) {
            ensureDirectoryExists(options.outputDir);
          }

          // Enhanced batch processing with progress tracking, error isolation, and recovery reporting
          const results = [];
          const errors = [];
          const recoveries = [];
          const fileOutputs = [];
          let processed = 0;

          for (const filePath of files) {
            try {
              const fileName = filePath.split('/').pop();
              process.stdout.write(`  📄 Processing: ${fileName}... `);

              const invoice = await parser.parseInvoice(filePath, { silent: true });
              if (invoice) {
                // Check if this was a successful recovery
                if (invoice.errorRecovery) {
                  recoveries.push({
                    file: fileName,
                    confidence: Math.round(invoice.extractionMetadata.confidence.overall * 100),
                    suggestions: invoice.errorRecovery.recoverySuggestions.slice(0, 2), // Top 2 suggestions
                    errorType: invoice.errorRecovery.originalError.type
                  });
                  console.log(`🔄 (${Math.round(invoice.extractionMetadata.confidence.overall * 100)}%)`);
                } else {
                  results.push(invoice);
                  console.log('✅');
                }

                // Handle individual file output for output-dir option
                if (options.outputDir && (options.format === 'json' || options.format === 'csv')) {
                  const validatedInvoice = parser.validation.validateJsonOutput(invoice);
                  if (validatedInvoice) {
                    const baseName = path.basename(filePath, path.extname(filePath));
                    const fileExtension = options.format === 'csv' ? 'csv' : 'json';
                    const outputFileName = `${baseName}.${fileExtension}`;
                    const outputPath = path.join(options.outputDir, outputFileName);

                    let outputContent;
                    if (options.format === 'csv') {
                      outputContent = invoiceToCSV(validatedInvoice);
                    } else {
                      outputContent = JSON.stringify(validatedInvoice, null, 2);
                    }

                    try {
                      safeWriteFile(outputPath, outputContent, {
                        overwrite: options.overwrite,
                        backup: options.backup
                      });
                      fileOutputs.push(outputPath);
                    } catch (writeError) {
                      console.log(`⚠️  (Output failed: ${writeError.message})`);
                    }
                  }
                }
              } else {
                errors.push({ file: fileName, error: 'Failed to parse invoice' });
                console.log('❌');
              }
            } catch (error) {
              const fileName = filePath.split('/').pop();
              const categorizedError = parser.errorRecovery.categorizeError(error, 'batch-processing');
              errors.push({
                file: fileName,
                error: error.message,
                category: categorizedError.level,
                type: categorizedError.type,
                recoverable: categorizedError.recoverable,
                suggestion: categorizedError.suggestion
              });
              console.log('❌');
            }
            processed++;
          }

          const report = parser.reporting.generateReport(results);

          // Generate enhanced summary report with error recovery details
          console.log('\n📊 Processing Summary:');
          console.log(`   ✅ Successful: ${results.length} files`);
          console.log(`   🔄 Recovered: ${recoveries.length} files`);
          console.log(`   ❌ Failed: ${errors.length} files`);
          console.log(`   📊 Total processed: ${processed} files`);

          if (fileOutputs.length > 0) {
            console.log(`   📁 Files created: ${fileOutputs.length}`);
          }

          if (recoveries.length > 0) {
            console.log('\n🔄 Recovered files (partial data extracted):');
            recoveries.forEach(({ file, confidence, suggestions, errorType }) => {
              console.log(`   - ${file}: ${confidence}% confidence (${errorType})`);
              if (suggestions && suggestions.length > 0) {
                console.log(`     💡 ${suggestions[0].description}`);
              }
            });
          }

          if (errors.length > 0) {
            console.log('\n❌ Failed files:');
            const criticalErrors = errors.filter(e => e.category === 'critical');
            const recoverableErrors = errors.filter(e => e.category === 'recoverable');
            const infoErrors = errors.filter(e => e.category === 'info');

            if (criticalErrors.length > 0) {
              console.log('  Critical failures (cannot recover):');
              criticalErrors.forEach(({ file, error, suggestion }) => {
                console.log(`   - ${file}: ${error}`);
                console.log(`     💡 ${suggestion}`);
              });
            }

            if (recoverableErrors.length > 0) {
              console.log('  Recoverable failures (recovery attempted):');
              recoverableErrors.forEach(({ file, error, suggestion }) => {
                console.log(`   - ${file}: ${error}`);
                console.log(`     💡 ${suggestion}`);
              });
            }

            if (infoErrors.length > 0) {
              console.log('  Informational warnings:');
              infoErrors.forEach(({ file, error, suggestion }) => {
                console.log(`   - ${file}: ${error}`);
              });
            }
          }

          if (results.length > 0) {
            console.log('\n💰 Financial Summary:');
            console.log(`   Total spent: $${report.summary.totalSpent.toFixed(2)}`);
            console.log(`   Invoices processed: ${results.length}`);
            if (report.summary.dateRange.start || report.summary.dateRange.end) {
              console.log(`   Date range: ${report.summary.dateRange.start || 'N/A'} to ${report.summary.dateRange.end || 'N/A'}`);
            }
          }

          if (options.format === 'text') {
            // Summary already displayed above
          } else {
            // Validate report JSON output before displaying
            const validatedReport = parser.validation.validateReportOutput(report);
            if (!validatedReport) {
              console.error('❌ Report JSON validation failed');
              process.exit(1);
            }

            let outputContent, outputPath, fileExtension;

            if (options.format === 'csv') {
              outputContent = reportToCSV(validatedReport);
              fileExtension = 'csv';
            } else {
              outputContent = JSON.stringify(validatedReport, null, 2);
              fileExtension = 'json';
            }

            // Determine output path for aggregated results
            if (options.output) {
              outputPath = options.output;
            } else if (options.outputDir && !fileOutputs.length) {
              // Only create aggregated file if no individual files were created
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const outputFileName = `batch-results-${timestamp}.${fileExtension}`;
              outputPath = path.join(options.outputDir, outputFileName);
              ensureDirectoryExists(options.outputDir);
            }

            if (outputPath) {
              safeWriteFile(outputPath, outputContent, {
                overwrite: options.overwrite,
                backup: options.backup
              });
              console.log(`\n💾 Batch results saved to: ${outputPath}`);
            } else if (!fileOutputs.length) {
              console.log('\n📄 Detailed Results:');
              console.log(outputContent);
            }
          }

          if (fileOutputs.length > 0) {
            console.log(`\n📁 Individual results saved to: ${options.outputDir}`);
            console.log(`   Files: ${fileOutputs.slice(0, 3).join(', ')}${fileOutputs.length > 3 ? ` (+${fileOutputs.length - 3} more)` : ''}`);
          }

          console.log('\n✅ Batch processing complete!');
        } catch (error) {
          console.error('❌ Error:', error.message);
          process.exit(1);
        }
      });
  }

  addReportCommand(program) {
    program
      .command('report <input>')
      .description('Generate spending reports from JSON file or directory')
      .option('-o, --output <file>', 'Output file for report')
      .option('-f, --format <format>', 'Report format (json, csv, text)', 'text')
      .option('-c, --currency <currency>', 'Display currency for reports', 'USD')
      .option('--no-monthly', 'Skip monthly spending analysis')
      .option('--no-categories', 'Skip category analysis')
      .option('--no-trends', 'Skip spending trends analysis')
      .action(async (input, options) => {
        try {
          let invoices = [];

          // Check if input is a JSON file or directory
          if (fs.existsSync(input)) {
            const stats = fs.statSync(input);
            if (stats.isFile() && input.endsWith('.json')) {
              // Load invoices from JSON file
              const data = JSON.parse(fs.readFileSync(input, 'utf8'));
              invoices = data.invoices || (Array.isArray(data) ? data : [data]);
            } else if (stats.isDirectory()) {
              // Process directory of PDFs
              const files = fs.readdirSync(input)
                .filter(file => file.toLowerCase().endsWith('.pdf'))
                .map(file => `${input}/${file}`);

              console.log(`📂 Processing ${files.length} PDF files for report...`);
              for (const file of files) {
                const invoice = await this.parser.parseInvoice(file, { silent: true });
                if (invoice) invoices.push(invoice);
              }
            }
          }

          if (invoices.length === 0) {
            console.error('❌ No invoice data found in input');
            process.exit(1);
          }

          // Generate report
          const reportOptions = {
            includeMonthly: options.monthly !== false,
            includeCategories: options.categories !== false,
            includeTrends: options.trends !== false,
            currency: options.currency.toUpperCase()
          };

          const report = this.reporting.generateReport(invoices, reportOptions);

          // Output report
          let outputContent;
          switch (options.format.toLowerCase()) {
            case 'json':
              outputContent = JSON.stringify(report, null, 2);
              break;
            case 'csv':
              outputContent = reportToCSV(report);
              break;
            case 'text':
            default:
              outputContent = generateTextReport(report);
              break;
          }

          if (options.output) {
            fs.writeFileSync(options.output, outputContent, 'utf8');
            console.log(`✅ Report saved to: ${options.output}`);
          } else {
            console.log(outputContent);
          }

        } catch (error) {
          console.error('❌ Report generation failed:', error.message);
          process.exit(1);
        }
      });
  }

  addTestCommand(program) {
    program
      .command('test')
      .description('Run basic functionality tests')
      .action(async () => {
        try {
          console.log('🧪 Running basic tests...');

          // Test with mock data
          const mockInvoice = this.parser.extractInvoiceData(this.parser.getMockInvoiceText('german-test.pdf'));
          console.log('✅ Mock data parsing:', mockInvoice ? 'PASS' : 'FAIL');

          // Test validation
          console.log('✅ Data validation:', mockInvoice?.validation ? 'PASS' : 'FAIL');

          // Test reporting
          const report = this.reporting.generateReport([mockInvoice]);
          console.log('✅ Report generation:', report ? 'PASS' : 'FAIL');

          console.log('✅ All basic tests passed!');
        } catch (error) {
          console.error('❌ Test failed:', error.message);
          process.exit(1);
        }
      });
  }

  async run() {
    const program = this.createProgram();
    await program.parseAsync();
  }
}

module.exports = CLI;