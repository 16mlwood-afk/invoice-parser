#!/usr/bin/env node

/**
 * Real Production Invoice Parser Setup
 *
 * This script demonstrates how to set up and use the Amazon Invoice Parser
 * with real production Amazon invoice PDFs.
 */

const AmazonInvoiceParser = require('./index');
const fs = require('fs');
const path = require('path');

const INVOICES_DIR = './real-invoices';
const RESULTS_DIR = './real-results';

async function setupDirectories() {
  console.log('🏗️ Setting up directories for real invoice processing...\n');

  // Create directories if they don't exist
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
    console.log(`📁 Created ${INVOICES_DIR} - place your real Amazon invoice PDFs here`);
  } else {
    console.log(`📁 ${INVOICES_DIR} already exists`);
  }

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    console.log(`📁 Created ${RESULTS_DIR} - parsed results will be saved here`);
  } else {
    console.log(`📁 ${RESULTS_DIR} already exists`);
  }

  console.log('');
}

async function checkForInvoices() {
  console.log('🔍 Checking for invoice files...\n');

  try {
    const files = fs.readdirSync(INVOICES_DIR);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('📋 No PDF files found in', INVOICES_DIR);
      console.log('');
      console.log('📝 To use real invoices:');
      console.log('1. Download your Amazon invoice PDFs from amazon.com/orders');
      console.log('2. Place them in the', INVOICES_DIR, 'directory');
      console.log('3. Run this script again');
      console.log('');
      return [];
    }

    console.log(`📄 Found ${pdfFiles.length} PDF file(s):`);
    pdfFiles.forEach((file, index) => {
      const filePath = path.join(INVOICES_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${index + 1}. ${file} (${sizeMB} MB)`);
    });

    console.log('');
    return pdfFiles.map(file => path.join(INVOICES_DIR, file));

  } catch (error) {
    console.error('❌ Error reading invoices directory:', error.message);
    return [];
  }
}

async function parseInvoice(filePath) {
  const parser = new AmazonInvoiceParser();
  const fileName = path.basename(filePath, '.pdf');

  console.log(`🔄 Processing: ${fileName}.pdf`);

  try {
    const invoice = await parser.parseInvoice(filePath);

    if (invoice) {
      console.log('✅ Successfully parsed!');

      // Save to JSON file
      const outputPath = path.join(RESULTS_DIR, `${fileName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(invoice, null, 2));
      console.log(`💾 Saved results to: ${outputPath}`);

      // Display key information
      console.log('📋 Key Data:');
      console.log(`   Order: ${invoice.orderNumber || 'Not found'}`);
      console.log(`   Date: ${invoice.orderDate || 'Not found'}`);
      console.log(`   Total: ${invoice.total || 'Not found'}`);
      console.log(`   Items: ${invoice.items?.length || 0}`);

      if (invoice.errorRecovery) {
        console.log('⚠️  Used error recovery - data may need verification');
      }

    } else {
      console.log('❌ Failed to parse invoice');
    }

  } catch (error) {
    console.error(`💥 Error parsing ${fileName}:`, error.message);
  }

  console.log('');
}

async function generateSummaryReport(allInvoices) {
  if (allInvoices.length === 0) return;

  console.log('📊 Generating summary report...\n');

  const parser = new AmazonInvoiceParser();
  const report = parser.generateReport(allInvoices);

  // Save summary report
  const summaryPath = path.join(RESULTS_DIR, 'summary-report.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));

  console.log('📈 Summary Report:');
  console.log(`   Total Invoices: ${report.totalInvoices}`);
  console.log(`   Total Spent: ${report.totalSpent.toFixed(2)} ${report.primaryCurrency}`);
  console.log(`   Date Range: ${report.dateRange.start} to ${report.dateRange.end}`);
  console.log(`   Currencies: ${report.currencies.join(', ')}`);
  console.log('');
  console.log(`💾 Full report saved to: ${summaryPath}`);
}

async function main() {
  console.log('🧾 Amazon Invoice Parser - Real Production Usage\n');
  console.log('================================================\n');

  await setupDirectories();

  const invoiceFiles = await checkForInvoices();

  if (invoiceFiles.length === 0) {
    console.log('🚀 Ready for real invoices! Add PDF files to', INVOICES_DIR, 'and run again.');
    console.log('');
    console.log('💡 Pro Tips:');
    console.log('- Download invoices from: https://www.amazon.com/orders');
    console.log('- Click "Invoice" on any order to download PDF');
    console.log('- Works with any Amazon marketplace (US, DE, FR, UK, etc.)');
    console.log('- Supports multiple currencies (€, £, $, etc.)');
    return;
  }

  console.log('🚀 Starting real invoice processing...\n');

  const allInvoices = [];

  for (const filePath of invoiceFiles) {
    const invoice = await parseInvoice(filePath);
    if (invoice) {
      allInvoices.push(invoice);
    }
  }

  await generateSummaryReport(allInvoices);

  console.log('🎉 Processing complete!');
  console.log('');
  console.log('📁 Check the', RESULTS_DIR, 'directory for all results');
  console.log('📊 View summary-report.json for spending analysis');
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('🧾 Amazon Invoice Parser - Real Production Setup');
    console.log('');
    console.log('Usage:');
    console.log('  node real-invoices-setup.js          # Setup and process invoices');
    console.log('  node real-invoices-setup.js --help   # Show this help');
    console.log('');
    console.log('Directories:');
    console.log('  ./real-invoices/    Place your Amazon invoice PDFs here');
    console.log('  ./real-results/     Parsed results are saved here');
    console.log('');
    console.log('Examples:');
    console.log('  1. Run this script to set up directories');
    console.log('  2. Add your Amazon invoice PDFs to ./real-invoices/');
    console.log('  3. Run script again to process real invoices');
    process.exit(0);
  }

  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main, setupDirectories, checkForInvoices, parseInvoice };