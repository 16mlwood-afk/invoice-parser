#!/usr/bin/env node

/**
 * Generate Clean Report - Test the reporting functionality
 */

const AmazonInvoiceParser = require('../index');
const fs = require('fs');
const path = require('path');

async function generateCleanReport() {
  console.log('📊 Generating Clean Test Report\n');

  const resultsDir = path.join(__dirname, '..', 'results', 'clean-test-results');
  const reportFile = path.join(__dirname, '..', 'results', 'clean-test-report.json');

  try {
    // Load all parsed invoices
    const files = fs.readdirSync(resultsDir);
    const invoices = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(resultsDir, file);
          const invoiceData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          invoices.push(invoiceData);
        } catch (error) {
          console.error(`❌ Error loading ${file}:`, error.message);
        }
      }
    }

    if (invoices.length === 0) {
      console.log('❌ No invoice data found');
      return;
    }

    console.log(`📄 Loaded ${invoices.length} invoices`);

    // Generate comprehensive report
    const parser = new AmazonInvoiceParser();
    const report = parser.generateReport(invoices);

    // Save report
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved to: ${reportFile}`);

    // Display key metrics
    console.log('\n📊 CLEAN TEST RESULTS:');
    console.log('======================');
    console.log(`Total Invoices: ${report.summary.totalInvoices}`);
    console.log(`Total Spent: $${report.summary.totalSpent.toFixed(2)}`);
    console.log(`Currencies: ${report.currencyBreakdown.map(c => c.currency).join(', ')}`);
    console.log(`Successful Parses: ${report.invoices.filter(i => i.validation?.isValid !== false).length}`);
    console.log(`Error Recovery Used: ${report.invoices.filter(i => i.errorRecovery).length}`);

    console.log('\n✅ Clean report generation complete!');

  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateCleanReport().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { generateCleanReport };