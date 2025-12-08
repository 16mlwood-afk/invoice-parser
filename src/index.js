// Main entry point for the Amazon Invoice Parser library
const AmazonInvoiceParser = require('./parser/parser');
const Reporting = require('./reports/reporting');
const CLI = require('./cli/cli');
const generateTextReport = require('./cli/text-report-generator');
const ParserFactory = require('./parser-factory');

// Export main classes and functions
module.exports = AmazonInvoiceParser;
module.exports.AmazonInvoiceParser = AmazonInvoiceParser;
module.exports.Reporting = Reporting;
module.exports.CLI = CLI;
module.exports.generateTextReport = generateTextReport;
module.exports.ParserFactory = ParserFactory;

// CLI execution
if (require.main === module) {
  const cli = new CLI();
  cli.run().catch(error => {
    console.error('CLI execution failed:', error.message);
    process.exit(1);
  });
}